import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { WalletConnectRegister } from '../../components/auth/WalletConnectRegister';

export const RegisterPage: React.FC = () => {
  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4"
      style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #f9fafb, #dbeafe)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div className="w-full max-w-md mx-auto" style={{ maxWidth: '500px' }}>
        {/* 品牌标识 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">MultiSig Pro</h1>
          <p className="text-gray-600">企业级多重签名钱包</p>
        </div>

        {/* 钱包连接注册组件 */}
        <WalletConnectRegister />

        {/* 登录链接 */}
        <div className="text-center mt-6">
          <p className="text-gray-600">
            已有账户？{' '}
            <Link
              to="/login"
              className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
            >
              立即登录
            </Link>
          </p>
        </div>

        {/* 底部信息 */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            创建账户即表示您同意我们的{' '}
            <a href="#" className="text-blue-600 hover:text-blue-500 transition-colors">服务条款</a>
            {' '}和{' '}
            <a href="#" className="text-blue-600 hover:text-blue-500 transition-colors">隐私政策</a>
          </p>
        </div>
      </div>
    </div>
  );
};

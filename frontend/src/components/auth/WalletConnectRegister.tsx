import React, { useState } from 'react';
import { buildApiUrl, API_ENDPOINTS, getAuthHeaders } from '../../config/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Wallet, User, Mail, Lock, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { useWalletStore } from '../../stores/walletStore';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type RegisterFormData = z.infer<typeof registerSchema>;

export const WalletConnectRegister: React.FC = () => {
  const { isConnected, address, connect } = useWalletStore();
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<'wallet' | 'form' | 'success'>('wallet');

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema)
  });

  const handleConnectWallet = async () => {
    try {
      await connect();
      if (address) {
        setRegistrationStep('form');
      }
    } catch (error) {
      console.error('钱包连接失败:', error);
      const errorMessage = error instanceof Error ? error.message : '钱包连接失败，请重试';
      alert(errorMessage);
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first');
      return;
    }

    setIsRegistering(true);
    try {
      const response = await fetch(buildApiUrl('/api/v1/auth/register'), {
        method: 'POST',
        headers: {
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          email: data.email,
          name: data.name,
          password: data.password,
          wallet_address: address // 关联钱包地址
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      const result = await response.json();
      console.log('Registration successful:', result);
      setRegistrationStep('success');

    } catch (error) {
      console.error('Registration failed:', error);
      alert(`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRegistering(false);
    }
  };

  if (registrationStep === 'success') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Registration Successful!
            </h2>
            <p className="text-gray-600 mb-4">
              Your account has been created and linked to your wallet.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Wallet: {address}
            </p>
            <Button onClick={() => window.location.href = '/login'} className="w-full">
              Go to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (registrationStep === 'wallet') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">Connect Your Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-gray-600">
              连接您的MetaMask钱包来创建账户。点击连接后，您可以选择要使用的钱包账户，该地址将与您的账户永久关联。
            </p>
          </div>

          {!isConnected ? (
            <Button onClick={handleConnectWallet} className="w-full">
              <Wallet className="w-4 h-4 mr-2" />
              连接 MetaMask
            </Button>
          ) : (
            <div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-sm text-green-700">钱包已连接</span>
                </div>
                <p className="text-xs text-green-600 mt-1 font-mono break-all">
                  {address}
                </p>
              </div>
              <Button onClick={() => setRegistrationStep('form')} className="w-full">
                继续注册
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Create Account</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ 
          backgroundColor: '#eff6ff', 
          border: '1px solid #bfdbfe', 
          borderRadius: '0.5rem', 
          padding: '1rem', 
          marginBottom: '2rem' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
            <Wallet style={{ width: '1rem', height: '1rem', color: '#2563eb', marginRight: '0.5rem' }} />
            <span style={{ fontSize: '0.875rem', color: '#1d4ed8', fontWeight: '500' }}>Wallet Connected</span>
          </div>
          <p style={{ 
            fontSize: '0.75rem', 
            color: '#2563eb', 
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace', 
            wordBreak: 'break-all',
            lineHeight: '1.4'
          }}>
            {address}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '500', 
              color: '#374151', 
              marginBottom: '0.75rem' 
            }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail style={{ 
                position: 'absolute', 
                left: '0.75rem', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: '#9ca3af', 
                width: '1rem', 
                height: '1rem' 
              }} />
              <Input
                {...register('email')}
                type="email"
                placeholder="请输入邮箱"
                style={{ paddingLeft: '2.5rem', width: '100%', maxWidth: '20rem' }}
              />
            </div>
            {errors.email && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                {errors.email.message}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '500', 
              color: '#374151', 
              marginBottom: '0.75rem' 
            }}>
              Full Name
            </label>
            <div style={{ position: 'relative' }}>
              <User style={{ 
                position: 'absolute', 
                left: '0.75rem', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: '#9ca3af', 
                width: '1rem', 
                height: '1rem' 
              }} />
              <Input
                {...register('name')}
                placeholder="请输入姓名"
                style={{ paddingLeft: '2.5rem', width: '100%', maxWidth: '20rem' }}
              />
            </div>
            {errors.name && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                {errors.name.message}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '500', 
              color: '#374151', 
              marginBottom: '0.75rem' 
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock style={{ 
                position: 'absolute', 
                left: '0.75rem', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: '#9ca3af', 
                width: '1rem', 
                height: '1rem' 
              }} />
              <Input
                {...register('password')}
                type="password"
                placeholder="请输入密码"
                style={{ paddingLeft: '2.5rem', width: '100%', maxWidth: '20rem' }}
              />
            </div>
            {errors.password && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                {errors.password.message}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '500', 
              color: '#374151', 
              marginBottom: '0.75rem' 
            }}>
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock style={{ 
                position: 'absolute', 
                left: '0.75rem', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: '#9ca3af', 
                width: '1rem', 
                height: '1rem' 
              }} />
              <Input
                {...register('confirmPassword')}
                type="password"
                placeholder="请确认密码"
                style={{ paddingLeft: '2.5rem', width: '100%', maxWidth: '20rem' }}
              />
            </div>
            {errors.confirmPassword && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
            <button
              type="submit"
              disabled={isRegistering}
              style={{
                width: '12rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: isRegistering ? '#9ca3af' : '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: isRegistering ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease-in-out',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                background: isRegistering 
                  ? '#9ca3af' 
                  : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                transform: 'translateY(0)',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isRegistering) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isRegistering) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
                }
              }}
              onMouseDown={(e) => {
                if (!isRegistering) {
                  e.currentTarget.style.transform = 'translateY(1px)';
                }
              }}
              onMouseUp={(e) => {
                if (!isRegistering) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.3), 0 1px 3px 0 rgba(0, 0, 0, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
              }}
            >
              {isRegistering ? '创建账户中...' : '创建账户'}
            </button>
          </div>
        </form>

        <div style={{ 
          marginTop: '2rem', 
          padding: '1rem', 
          backgroundColor: '#fefce8', 
          border: '1px solid #fde047', 
          borderRadius: '0.5rem' 
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <AlertCircle style={{ 
              width: '1rem', 
              height: '1rem', 
              color: '#ca8a04', 
              marginTop: '0.125rem',
              flexShrink: 0
            }} />
            <div style={{ fontSize: '0.75rem', color: '#a16207', lineHeight: '1.4' }}>
              <p style={{ fontWeight: '500', marginBottom: '0.5rem' }}>重要提示：</p>
              <p>您的钱包地址将永久关联到此账户。请确保您拥有此钱包的控制权。</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

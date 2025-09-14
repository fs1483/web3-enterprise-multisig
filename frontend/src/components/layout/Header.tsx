import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useWalletStore } from '../../stores/walletStore';
import { Button } from '../ui/Button';

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { isConnected, address, connect, disconnect } = useWalletStore();

  return (
    <header className="bg-white shadow-lg border-b border-gray-100 backdrop-blur-sm bg-white/95">
      <div className="mx-auto max-w-7xl px-2 sm:px-4 lg:px-6">
        <div className="flex h-16 justify-between items-center">
          <div className="flex items-center min-w-0 flex-shrink">
            <h1 className="text-sm sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent truncate">
              <span className="hidden sm:inline">Web3 Enterprise MultiSig</span>
              <span className="sm:hidden">MultiSig</span>
            </h1>
          </div>

          <div style={{
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px'
          }}>
            {/* Wallet Connection */}
            {isConnected ? (
              <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                <div style={{
                  backgroundColor: '#ecfdf5', 
                  color: '#047857', 
                  padding: '6px 10px', 
                  borderRadius: '8px', 
                  fontSize: '13px',
                  fontWeight: '500',
                  border: '1px solid #a7f3d0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}>
                  <div style={{
                    width: '8px', 
                    height: '8px', 
                    backgroundColor: '#10b981', 
                    borderRadius: '50%',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                  }}></div>
                  <span style={{display: window.innerWidth >= 640 ? 'inline' : 'none'}}>
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                  <span style={{display: window.innerWidth >= 640 ? 'none' : 'inline'}}>
                    Connected
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnect}
                  style={{
                    fontSize: '12px', 
                    padding: '6px 10px', 
                    height: '32px',
                    borderColor: '#e5e7eb',
                    color: '#6b7280',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fef2f2';
                    e.currentTarget.style.borderColor = '#fecaca';
                    e.currentTarget.style.color = '#dc2626';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.color = '#6b7280';
                  }}
                >
                  <span style={{display: window.innerWidth >= 640 ? 'inline' : 'none'}}>Disconnect</span>
                  <span style={{display: window.innerWidth >= 640 ? 'none' : 'inline'}}>×</span>
                </Button>
              </div>
            ) : (
              <Button 
                onClick={connect}
                size="sm"
                style={{
                  background: 'linear-gradient(to right, #3b82f6, #6366f1)', 
                  color: 'white', 
                  fontSize: '13px', 
                  fontWeight: '500',
                  padding: '6px 14px', 
                  height: '32px',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                }}
              >
                <span style={{display: window.innerWidth >= 640 ? 'inline' : 'none'}}>Connect Wallet</span>
                <span style={{display: window.innerWidth >= 640 ? 'none' : 'inline'}}>Connect</span>
              </Button>
            )}

            {/* User Menu */}
            <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
              <div style={{
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                backgroundColor: '#f8fafc', 
                borderRadius: '8px', 
                padding: '6px 10px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{
                  width: '28px', 
                  height: '28px', 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.1)'
                }}>
                  <span style={{color: 'white', fontSize: '13px', fontWeight: '600'}}>
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div style={{display: window.innerWidth >= 1024 ? 'block' : 'none'}}>
                  <p style={{
                    fontSize: '13px', 
                    fontWeight: '600', 
                    color: '#1f2937', 
                    margin: 0,
                    lineHeight: '1.2'
                  }}>
                    {user?.name || 'User'}
                  </p>
                  <p style={{
                    fontSize: '11px', 
                    color: '#6b7280', 
                    margin: 0,
                    lineHeight: '1.2'
                  }}>
                    {user?.role || 'Member'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                style={{
                  fontSize: '12px', 
                  padding: '6px 10px', 
                  height: '32px',
                  borderColor: '#e5e7eb',
                  color: '#6b7280',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fef2f2';
                  e.currentTarget.style.borderColor = '#fecaca';
                  e.currentTarget.style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.color = '#6b7280';
                }}
              >
                <span style={{display: window.innerWidth >= 640 ? 'inline' : 'none'}}>Logout</span>
                <span style={{display: window.innerWidth >= 640 ? 'none' : 'inline'}}>Out</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

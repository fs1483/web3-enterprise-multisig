import { useNotificationStore } from '../stores/notificationStore';

// 测试页面内通知的工具函数
export const testInPageNotifications = () => {
  const { addNotification } = useNotificationStore.getState();

  // 测试新提案通知
  const testNewProposal = () => {
    addNotification({
      type: 'new_proposal_created',
      title: '新提案创建',
      message: '用户 0x1234...5678 创建了一个新的转账提案，金额为 100 USDT',
      data: {
        proposal_id: 'test-proposal-123',
        safe_id: 'test-safe-456',
        creator: '0x1234567890123456789012345678901234567890',
        amount: '100',
        token: 'USDT'
      }
    });
  };

  // 测试提案签名通知
  const testProposalSigned = () => {
    addNotification({
      type: 'proposal_signed',
      title: '提案已签名',
      message: '用户 0xabcd...efgh 已签名提案 #123，当前签名进度 2/3',
      data: {
        proposal_id: 'test-proposal-123',
        safe_id: 'test-safe-456',
        signer: '0xabcdefghijklmnopqrstuvwxyz1234567890abcdef',
        current_signatures: 2,
        required_signatures: 3
      }
    });
  };

  // 测试提案执行通知
  const testProposalExecuted = () => {
    addNotification({
      type: 'proposal_executed',
      title: '提案已执行',
      message: '提案 #123 已成功执行，100 USDT 已转账至目标地址',
      data: {
        proposal_id: 'test-proposal-123',
        safe_id: 'test-safe-456',
        transaction_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      }
    });
  };

  // 测试Safe创建通知
  const testSafeCreated = () => {
    addNotification({
      type: 'safe_created',
      title: '新Safe钱包创建',
      message: '新的多签钱包已创建成功，地址: 0x9876...5432',
      data: {
        safe_id: 'test-safe-789',
        safe_address: '0x9876543210987654321098765432109876543210',
        owners: ['0x1111111111111111111111111111111111111111', '0x2222222222222222222222222222222222222222'],
        threshold: 2
      }
    });
  };

  // 测试警告通知
  const testWarning = () => {
    addNotification({
      type: 'warning',
      title: '网络连接不稳定',
      message: '检测到网络连接不稳定，部分功能可能受到影响',
      data: {
        network_status: 'unstable',
        last_block: 12345678
      }
    });
  };

  // 测试错误通知
  const testError = () => {
    addNotification({
      type: 'error',
      title: '交易失败',
      message: '提案执行失败，请检查网络状态和Gas费用设置',
      data: {
        error_code: 'TRANSACTION_FAILED',
        proposal_id: 'test-proposal-456'
      }
    });
  };

  return {
    testNewProposal,
    testProposalSigned,
    testProposalExecuted,
    testSafeCreated,
    testWarning,
    testError,
    // 测试所有类型
    testAll: () => {
      testNewProposal();
      setTimeout(() => testProposalSigned(), 2000);
      setTimeout(() => testProposalExecuted(), 4000);
      setTimeout(() => testSafeCreated(), 6000);
      setTimeout(() => testWarning(), 8000);
      setTimeout(() => testError(), 10000);
    }
  };
};

// 在浏览器控制台中可用的全局测试函数
if (typeof window !== 'undefined') {
  (window as any).testInPageNotifications = testInPageNotifications;
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 通知类型定义
export interface Notification {
  id: string;
  type: 'new_proposal_created' | 'proposal_signed' | 'proposal_executed' | 'proposal_execution_success' | 'proposal_execution_failed' | 'safe_created' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  data?: any;
  timestamp: number;
  read: boolean;
  userId?: string;
}

// WebSocket连接状态
export interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastConnected: number | null;
}

interface NotificationStore {
  // 通知列表
  notifications: Notification[];
  
  // WebSocket状态
  wsState: WebSocketState;
  
  // WebSocket实例
  ws: WebSocket | null;
  
  // 浏览器通知权限
  notificationPermission: NotificationPermission;
  
  // 页面内通知回调
  inPageNotificationCallback: ((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void) | null;
  
  // 操作方法
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // 浏览器通知相关方法
  requestNotificationPermission: () => void;
  showBrowserNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  
  // 页面内通知相关方法
  setInPageNotificationCallback: (callback: ((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void) | null) => void;
  showInPageNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  
  // WebSocket方法
  connectWebSocket: (token: string) => void;
  disconnectWebSocket: () => void;
  sendMessage: (message: any) => void;
  
  // 获取未读通知数量
  getUnreadCount: () => number;
  
  // 获取特定类型的通知
  getNotificationsByType: (type: string) => Notification[];
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      wsState: {
        connected: false,
        connecting: false,
        error: null,
        lastConnected: null,
      },
      ws: null,
      notificationPermission: 'Notification' in window ? Notification.permission : 'denied',
      inPageNotificationCallback: null,

      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          read: false,
        };

        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 100), // 保持最多100条通知
        }));

        // 显示浏览器原生通知
        get().showBrowserNotification(notification);
        
        // 显示页面内模态通知
        get().showInPageNotification(notification);
      },

      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }));
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
      },

      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      clearNotifications: () => {
        set({ notifications: [] });
      },

      connectWebSocket: (token) => {
        const currentState = get();
        
        // 如果已经连接或正在连接，则不重复连接
        if (currentState.ws && (currentState.ws.readyState === WebSocket.OPEN || currentState.ws.readyState === WebSocket.CONNECTING)) {
          console.log('🔗 WebSocket已连接或正在连接中');
          return;
        }

        // 断开现有连接
        if (currentState.ws) {
          currentState.ws.close();
        }

        set((state) => ({
          wsState: { ...state.wsState, connecting: true, error: null }
        }));

        try {
          // 构建WebSocket URL
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
          const wsUrl = baseUrl.replace('http://', 'ws://').replace('https://', 'wss://');
          const fullWsUrl = `${wsUrl}/ws?token=${encodeURIComponent(token)}`;

          console.log('🔗 建立WebSocket连接:', fullWsUrl);
          const ws = new WebSocket(fullWsUrl);

          ws.onopen = () => {
            console.log('✅ WebSocket连接已建立');
            set(() => ({
              ws,
              wsState: {
                connected: true,
                connecting: false,
                error: null,
                lastConnected: Date.now(),
              }
            }));

            // 订阅提案通知
            ws.send(JSON.stringify({
              type: 'subscribe_proposal_notifications',
              data: {}
            }));
          };

          ws.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);
              console.log('📡 收到WebSocket消息:', message);

              // 处理新提案创建通知
              if (message.type === 'new_proposal_created') {
                console.log('🔔 收到新提案通知:', message.data);
                const proposalData = message.data;
                const notification = {
                  type: 'new_proposal_created' as const,
                  title: '新提案待签名',
                  message: `提案"${proposalData.proposal_title || proposalData.title}"需要您的签名`,
                  data: proposalData,
                };
                get().addNotification(notification);
                
                // 显示浏览器原生通知
                get().showBrowserNotification(notification);
                console.log('✅ 新提案通知已添加到通知列表');
              }
              
              // 处理提案签名通知
              else if (message.type === 'proposal_signed') {
                const signData = message.data;
                const notification = {
                  type: 'proposal_signed' as const,
                  title: '提案已签名',
                  message: `提案"${signData.proposal_title}"已收到新的签名`,
                  data: signData,
                };
                get().addNotification(notification);
                get().showBrowserNotification(notification);
              }
              
              // 处理提案执行通知
              else if (message.type === 'proposal_executed') {
                const execData = message.data;
                const notification = {
                  type: 'proposal_executed' as const,
                  title: '提案已执行',
                  message: `提案"${execData.proposal_title}"已成功执行`,
                  data: execData,
                };
                get().addNotification(notification);
                get().showBrowserNotification(notification);
              }
              
              // 处理提案执行成功通知
              else if (message.type === 'proposal_execution_success') {
                console.log('🎉 收到提案执行成功通知:', message.data);
                const execData = message.data;
                const notification = {
                  type: 'proposal_execution_success' as const,
                  title: '提案执行成功',
                  message: `提案"${execData.proposal_title}"已在区块链上成功执行`,
                  data: execData,
                };
                get().addNotification(notification);
                get().showBrowserNotification(notification);
                console.log('✅ 提案执行成功通知已添加到通知列表');
              }
              
              // 处理提案执行失败通知
              else if (message.type === 'proposal_execution_failed') {
                console.log('❌ 收到提案执行失败通知:', message.data);
                const execData = message.data;
                const notification = {
                  type: 'proposal_execution_failed' as const,
                  title: '提案执行失败',
                  message: `提案"${execData.proposal_title}"执行失败: ${execData.failure_reason || '未知原因'}`,
                  data: execData,
                };
                get().addNotification(notification);
                get().showBrowserNotification(notification);
                console.log('⚠️ 提案执行失败通知已添加到通知列表');
              }
              
              // 处理Safe创建通知
              else if (message.type === 'safe_created') {
                const safeData = message.data;
                const notification = {
                  type: 'safe_created' as const,
                  title: 'Safe钱包已创建',
                  message: `新的Safe钱包"${safeData.safe_name}"已成功创建`,
                  data: safeData,
                };
                get().addNotification(notification);
                get().showBrowserNotification(notification);
              }

            } catch (err) {
              console.error('解析WebSocket消息失败:', err);
            }
          };

          ws.onclose = (event) => {
            console.log('❌ WebSocket连接已断开', event.code, event.reason);
            set((state) => ({
              ws: null,
              wsState: {
                ...state.wsState,
                connected: false,
                connecting: false,
              }
            }));

            // 只在非正常关闭时重连，避免无限重连
            if (event.code !== 1000 && event.code !== 1001) {
              console.log('🔄 5秒后尝试重连...');
              setTimeout(() => {
                const currentState = get();
                if (!currentState.wsState.connected && !currentState.wsState.connecting) {
                  currentState.connectWebSocket(token);
                }
              }, 5000);
            }
          };

          ws.onerror = (error) => {
            console.error('WebSocket连接错误:', error);
            set((state) => ({
              wsState: {
                ...state.wsState,
                connected: false,
                connecting: false,
                error: 'WebSocket连接失败',
              }
            }));
          };

          set({ ws });

        } catch (error) {
          console.error('创建WebSocket连接失败:', error);
          set((state) => ({
            wsState: {
              ...state.wsState,
              connected: false,
              connecting: false,
              error: '创建WebSocket连接失败',
            }
          }));
        }
      },

      disconnectWebSocket: () => {
        const currentState = get();
        if (currentState.ws) {
          currentState.ws.close(1000, 'User disconnected');
          set({
            ws: null,
            wsState: {
              connected: false,
              connecting: false,
              error: null,
              lastConnected: currentState.wsState.lastConnected,
            }
          });
        }
      },

      sendMessage: (message) => {
        const currentState = get();
        if (currentState.ws && currentState.ws.readyState === WebSocket.OPEN) {
          currentState.ws.send(JSON.stringify(message));
        } else {
          console.warn('WebSocket未连接，无法发送消息');
        }
      },

      getUnreadCount: () => {
        return get().notifications.filter(n => !n.read).length;
      },

      getNotificationsByType: (type) => {
        return get().notifications.filter(n => n.type === type);
      },

      // 请求浏览器通知权限
      requestNotificationPermission: () => {
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission().then((permission) => {
            set({ notificationPermission: permission });
          });
        }
      },

      // 显示浏览器原生通知
      showBrowserNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        console.log('🔔 尝试显示浏览器通知:', notification.title);
        console.log('📋 当前通知权限状态:', Notification.permission);
        
        if (!('Notification' in window)) {
          console.warn('⚠️ 此浏览器不支持通知功能');
          return;
        }

        if (Notification.permission === 'granted') {
          try {
            const browserNotification = new window.Notification(notification.title, {
              body: notification.message,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: notification.type,
              requireInteraction: false, // 改为false，让通知可以自动消失
              silent: false,
            });

            console.log('✅ 浏览器通知已创建');

            // 点击通知时的处理
            browserNotification.onclick = () => {
              console.log('🖱️ 用户点击了通知');
              window.focus(); // 聚焦到浏览器窗口
              
              // 根据通知类型导航到相应页面
              if (notification.type === 'new_proposal_created' && notification.data?.proposal_id) {
                window.location.href = `/proposals/${notification.data.proposal_id}`;
              } else if (notification.type === 'safe_created' && notification.data?.safe_id) {
                window.location.href = `/safes/${notification.data.safe_id}`;
              } else if ((notification.type === 'proposal_execution_success' || notification.type === 'proposal_execution_failed') && notification.data?.proposal_id) {
                // 对于执行结果通知，跳转到提案详情页
                window.location.href = `/proposals/${notification.data.proposal_id}`;
              }
              
              browserNotification.close();
            };

            // 通知显示时的处理
            browserNotification.onshow = () => {
              console.log('📱 通知已显示在屏幕上');
            };

            // 通知错误处理
            browserNotification.onerror = (error) => {
              console.error('❌ 通知显示失败:', error);
            };

            // 自动关闭通知（8秒后）
            setTimeout(() => {
              browserNotification.close();
              console.log('⏰ 通知已自动关闭');
            }, 8000);

          } catch (error) {
            console.error('❌ 创建浏览器通知失败:', error);
          }
        } else if (Notification.permission === 'denied') {
          console.warn('⚠️ 浏览器通知权限被拒绝');
        } else if (Notification.permission === 'default') {
          console.log('📋 请求浏览器通知权限...');
          get().requestNotificationPermission();
        }
      },

      // 设置页面内通知回调
      setInPageNotificationCallback: (callback) => {
        set({ inPageNotificationCallback: callback });
      },

      // 显示页面内通知
      showInPageNotification: (notification) => {
        const callback = get().inPageNotificationCallback;
        if (callback) {
          callback(notification);
        }
      },
    }),
    {
      name: 'notification-store',
      // 只持久化通知数据，不持久化WebSocket连接状态
      partialize: (state) => ({
        notifications: state.notifications,
      }),
    }
  )
);

// 请求浏览器通知权限
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('此浏览器不支持通知功能');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('用户已拒绝通知权限');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('请求通知权限失败:', error);
    return false;
  }
};

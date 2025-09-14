package websocket

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"

	"web3-enterprise-multisig/internal/models"
)

// Hub WebSocket连接管理中心
// 负责管理所有WebSocket连接，实现实时状态推送
type Hub struct {
	// 客户端连接管理
	clients     map[*Client]bool        // 活跃的客户端连接
	userClients map[uuid.UUID][]*Client // 按用户ID索引的客户端连接

	// 消息通道
	broadcast  chan []byte  // 广播消息通道
	register   chan *Client // 客户端注册通道
	unregister chan *Client // 客户端注销通道

	// 并发安全
	mutex sync.RWMutex
}

// Client WebSocket客户端连接
type Client struct {
	// WebSocket连接
	conn *websocket.Conn

	// 用户信息
	userID uuid.UUID

	// 消息发送通道
	send chan []byte

	// Hub引用
	hub *Hub
}

// WebSocketMessage WebSocket消息结构
type WebSocketMessage struct {
	Type      string      `json:"type"`
	Data      interface{} `json:"data"`
	Timestamp int64       `json:"timestamp"`
}

// SafeCreationUpdate Safe创建状态更新消息
type SafeCreationUpdate struct {
	TransactionID uuid.UUID                    `json:"transaction_id"`
	TxHash        string                       `json:"tx_hash"`
	Status        models.SafeTransactionStatus `json:"status"`
	StatusDesc    string                       `json:"status_description"`
	SafeAddress   *string                      `json:"safe_address,omitempty"`
	Progress      int                          `json:"progress"`
	Message       string                       `json:"message"`
	SafeName      string                       `json:"safe_name"`
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// 在生产环境中应该检查Origin
		return true
	},
}

// NewHub 创建新的WebSocket Hub
func NewHub() *Hub {
	return &Hub{
		clients:     make(map[*Client]bool),
		userClients: make(map[uuid.UUID][]*Client),
		broadcast:   make(chan []byte),
		register:    make(chan *Client),
		unregister:  make(chan *Client),
	}
}

// Run 启动Hub运行循环
func (h *Hub) Run() {
	log.Println("🚀 启动WebSocket Hub...")

	for {
		select {
		case client := <-h.register:
			h.registerClient(client)

		case client := <-h.unregister:
			h.unregisterClient(client)

		case message := <-h.broadcast:
			h.broadcastMessage(message)
		}
	}
}

// registerClient 注册新客户端
func (h *Hub) registerClient(client *Client) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	// 添加到客户端列表
	h.clients[client] = true

	// 按用户ID索引
	h.userClients[client.userID] = append(h.userClients[client.userID], client)

	log.Printf("✅ 用户 %s 的WebSocket连接已注册 (总连接数: %d)",
		client.userID.String(), len(h.clients))

	// 发送连接成功消息
	welcomeMsg := WebSocketMessage{
		Type: "connection_established",
		Data: map[string]interface{}{
			"message": "WebSocket连接已建立",
			"user_id": client.userID,
		},
		Timestamp: getCurrentTimestamp(),
	}

	client.sendMessage(welcomeMsg)
}

// unregisterClient 注销客户端
func (h *Hub) unregisterClient(client *Client) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	if _, ok := h.clients[client]; ok {
		// 从客户端列表中移除
		delete(h.clients, client)
		close(client.send)

		// 从用户索引中移除
		userClients := h.userClients[client.userID]
		for i, c := range userClients {
			if c == client {
				h.userClients[client.userID] = append(userClients[:i], userClients[i+1:]...)
				break
			}
		}

		// 如果用户没有其他连接，清理索引
		if len(h.userClients[client.userID]) == 0 {
			delete(h.userClients, client.userID)
		}

		log.Printf("❌ 用户 %s 的WebSocket连接已断开 (剩余连接数: %d)",
			client.userID.String(), len(h.clients))
	}
}

// broadcastMessage 广播消息给所有客户端
func (h *Hub) broadcastMessage(message []byte) {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	for client := range h.clients {
		select {
		case client.send <- message:
		default:
			// 客户端发送缓冲区满，关闭连接
			close(client.send)
			delete(h.clients, client)
		}
	}
}

// SendToUser 发送消息给特定用户的所有连接
func (h *Hub) SendToUser(userID uuid.UUID, message WebSocketMessage) {
	h.mutex.RLock()
	clients := h.userClients[userID]
	h.mutex.RUnlock()

	if len(clients) == 0 {
		log.Printf("⚠️ 用户 %s 没有活跃的WebSocket连接", userID.String())
		return
	}

	messageBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("❌ 序列化WebSocket消息失败: %v", err)
		return
	}

	for _, client := range clients {
		select {
		case client.send <- messageBytes:
		default:
			// 客户端发送缓冲区满，跳过
			log.Printf("⚠️ 用户 %s 的WebSocket发送缓冲区满", userID.String())
		}
	}

	log.Printf("📤 已向用户 %s 发送消息 (类型: %s, 连接数: %d)",
		userID.String(), message.Type, len(clients))
}

// NotifySafeCreationUpdate 通知Safe创建状态更新
func (h *Hub) NotifySafeCreationUpdate(userID uuid.UUID, update SafeCreationUpdate) {
	message := WebSocketMessage{
		Type:      "safe_creation_update",
		Data:      update,
		Timestamp: getCurrentTimestamp(),
	}

	h.SendToUser(userID, message)
}

// HandleWebSocket 处理WebSocket连接请求
func (h *Hub) HandleWebSocket(c *gin.Context) {
	log.Printf("🔍 收到WebSocket连接请求 - URL: %s, Method: %s", c.Request.URL.String(), c.Request.Method)
	log.Printf("🔍 请求头: %+v", c.Request.Header)

	// 从URL参数获取JWT token
	token := c.Query("token")
	if token == "" {
		log.Printf("❌ WebSocket连接缺少token参数")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "缺少认证token",
			"code":  "MISSING_TOKEN",
		})
		return
	}

	log.Printf("🔍 收到token (前10位): %s...", token[:min(10, len(token))])

	// 验证JWT token并提取用户ID
	userID, err := h.validateJWTToken(token)
	if err != nil {
		log.Printf("❌ WebSocket JWT token验证失败: %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "token验证失败",
			"code":  "INVALID_TOKEN",
		})
		return
	}

	log.Printf("✅ WebSocket JWT认证成功，用户ID: %s", userID.String())

	// 升级HTTP连接为WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("❌ WebSocket升级失败: %v", err)
		return
	}

	log.Printf("✅ WebSocket连接升级成功")

	// 创建客户端
	client := &Client{
		conn:   conn,
		userID: userID,
		send:   make(chan []byte, 256),
		hub:    h,
	}

	// 注册客户端
	h.register <- client

	// 启动客户端的读写协程
	go client.writePump()
	go client.readPump()
}

// validateJWTToken 验证JWT token并返回用户ID
func (h *Hub) validateJWTToken(tokenString string) (uuid.UUID, error) {
	// 获取JWT密钥
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-secret-key" // 默认密钥，生产环境应该使用环境变量
	}

	// 解析token
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// 验证签名方法
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return uuid.Nil, fmt.Errorf("解析token失败: %w", err)
	}

	// 验证token有效性
	if !token.Valid {
		return uuid.Nil, fmt.Errorf("token无效")
	}

	// 提取claims
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return uuid.Nil, fmt.Errorf("无法解析token claims")
	}

	// 提取用户ID
	userIDStr, ok := claims["user_id"].(string)
	if !ok {
		return uuid.Nil, fmt.Errorf("token中缺少user_id")
	}

	// 解析UUID
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return uuid.Nil, fmt.Errorf("用户ID格式错误: %w", err)
	}

	// 检查token是否过期
	if exp, ok := claims["exp"].(float64); ok {
		if time.Now().Unix() > int64(exp) {
			return uuid.Nil, fmt.Errorf("token已过期")
		}
	}

	return userID, nil
}

// readPump 处理客户端发送的消息
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	// 设置读取超时和消息大小限制
	c.conn.SetReadLimit(512)
	c.conn.SetReadDeadline(getCurrentTime().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(getCurrentTime().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("❌ WebSocket读取错误: %v", err)
			}
			break
		}

		// 处理客户端消息（如心跳、状态查询等）
		c.handleClientMessage(message)
	}
}

// writePump 向客户端发送消息
func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(getCurrentTime().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// 批量发送缓冲区中的其他消息
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(getCurrentTime().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleClientMessage 处理客户端消息
func (c *Client) handleClientMessage(message []byte) {
	var msg map[string]interface{}
	if err := json.Unmarshal(message, &msg); err != nil {
		log.Printf("❌ 解析客户端消息失败: %v", err)
		return
	}

	msgType, ok := msg["type"].(string)
	if !ok {
		return
	}

	switch msgType {
	case "ping":
		// 心跳响应
		pongMsg := WebSocketMessage{
			Type:      "pong",
			Data:      map[string]interface{}{"message": "pong"},
			Timestamp: getCurrentTimestamp(),
		}
		c.sendMessage(pongMsg)

	case "subscribe_safe_creation":
		// 订阅Safe创建状态更新
		transactionID, ok := msg["transaction_id"].(string)
		if ok {
			log.Printf("📡 用户 %s 订阅Safe创建状态: %s", c.userID.String(), transactionID)
		}
	}
}

// sendMessage 向客户端发送消息
func (c *Client) sendMessage(message WebSocketMessage) {
	messageBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("❌ 序列化消息失败: %v", err)
		return
	}

	select {
	case c.send <- messageBytes:
	default:
		close(c.send)
	}
}

// 辅助函数
func getCurrentTime() time.Time {
	return time.Now()
}

func getCurrentTimestamp() int64 {
	return time.Now().Unix()
}

// min 辅助函数
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

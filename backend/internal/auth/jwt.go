package auth

import (
    "errors"
    "os"
    "time"
    
    "github.com/golang-jwt/jwt/v5"
    "github.com/google/uuid"
)

type Claims struct {
    UserID   uuid.UUID `json:"user_id"`
    Username string    `json:"username"`
    Role     string    `json:"role"`
    jwt.RegisteredClaims
}

var jwtSecret = []byte(getJWTSecret())

func getJWTSecret() string {
    secret := os.Getenv("JWT_SECRET")
    if secret == "" {
        return "your-super-secret-jwt-key-change-in-production"
    }
    return secret
}

// GenerateToken 生成 JWT token
func GenerateToken(userID uuid.UUID, username, role string) (string, error) {
    expirationTime := time.Now().Add(24 * time.Hour)
    
    claims := &Claims{
        UserID:   userID,
        Username: username,
        Role:     role,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(expirationTime),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
            Issuer:    "multisig-api",
        },
    }
    
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(jwtSecret)
}

// ValidateToken 验证 JWT token
func ValidateToken(tokenString string) (*Claims, error) {
    claims := &Claims{}
    
    token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
        return jwtSecret, nil
    })
    
    if err != nil {
        return nil, err
    }
    
    if !token.Valid {
        return nil, errors.New("invalid token")
    }
    
    return claims, nil
}

// RefreshToken 刷新 token
func RefreshToken(tokenString string) (string, error) {
    claims, err := ValidateToken(tokenString)
    if err != nil {
        return "", err
    }
    
    // 检查 token 是否即将过期（1小时内）
    if time.Until(claims.ExpiresAt.Time) > time.Hour {
        return "", errors.New("token not eligible for refresh")
    }
    
    return GenerateToken(claims.UserID, claims.Username, claims.Role)
}

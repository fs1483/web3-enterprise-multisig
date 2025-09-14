package blockchain

import (
    "context"
    "fmt"
    "log"
    "math"
    "time"
)

type RetryConfig struct {
    MaxRetries      int
    InitialDelay    time.Duration
    MaxDelay        time.Duration
    BackoffFactor   float64
    RetryableErrors []string
}

var DefaultRetryConfig = RetryConfig{
    MaxRetries:    3,
    InitialDelay:  1 * time.Second,
    MaxDelay:      30 * time.Second,
    BackoffFactor: 2.0,
    RetryableErrors: []string{
        "connection refused",
        "timeout",
        "network error",
        "insufficient funds",
        "nonce too low",
        "replacement transaction underpriced",
    },
}

type RetryableFunc func() error

func WithRetry(ctx context.Context, config RetryConfig, fn RetryableFunc) error {
    var lastErr error

    for attempt := 0; attempt <= config.MaxRetries; attempt++ {
        if attempt > 0 {
            // 计算延迟时间（指数退避）
            delay := time.Duration(float64(config.InitialDelay) *
                math.Pow(config.BackoffFactor, float64(attempt-1)))

            if delay > config.MaxDelay {
                delay = config.MaxDelay
            }

            log.Printf("Retrying in %v (attempt %d/%d)", delay, attempt, config.MaxRetries)

            select {
            case <-ctx.Done():
                return ctx.Err()
            case <-time.After(delay):
            }
        }

        err := fn()
        if err == nil {
            if attempt > 0 {
                log.Printf("✅ Operation succeeded after %d retries", attempt)
            }
            return nil
        }

        lastErr = err

        // 检查是否为可重试错误
        if !isRetryableError(err, config.RetryableErrors) {
            log.Printf("❌ Non-retryable error: %v", err)
            return err
        }

        log.Printf("⚠️ Retryable error (attempt %d/%d): %v", attempt+1, config.MaxRetries+1, err)
    }

    return fmt.Errorf("operation failed after %d retries: %w", config.MaxRetries, lastErr)
}

func isRetryableError(err error, retryableErrors []string) bool {
    errStr := err.Error()
    for _, retryableErr := range retryableErrors {
        if contains(errStr, retryableErr) {
            return true
        }
    }
    return false
}

func contains(s, substr string) bool {
    return len(s) >= len(substr) && (s == substr ||
        (len(s) > len(substr) &&
            (s[:len(substr)] == substr ||
             s[len(s)-len(substr):] == substr ||
             indexOf(s, substr) >= 0)))
}

func indexOf(s, substr string) int {
    for i := 0; i <= len(s)-len(substr); i++ {
        if s[i:i+len(substr)] == substr {
            return i
        }
    }
    return -1
}

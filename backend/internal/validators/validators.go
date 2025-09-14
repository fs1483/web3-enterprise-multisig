package validators

import (
    "regexp"
    "github.com/go-playground/validator/v10"
)

var validate *validator.Validate

func init() {
    validate = validator.New()

    // 注册自定义验证器
    validate.RegisterValidation("ethereum_address", validateEthereumAddress)
    validate.RegisterValidation("strong_password", validateStrongPassword)
}

// GetValidator 获取验证器实例
func GetValidator() *validator.Validate {
    return validate
}


// validateEthereumAddress 验证以太坊地址
func validateEthereumAddress(fl validator.FieldLevel) bool {
    address := fl.Field().String()
    matched, _ := regexp.MatchString("^0x[a-fA-F0-9]{40}$", address)
    return matched
}

// validateStrongPassword 验证强密码
func validateStrongPassword(fl validator.FieldLevel) bool {
    password := fl.Field().String()

    // 至少8位，包含大小写字母和数字
    if len(password) < 8 {
        return false
    }

    hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
    hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
    hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)

    return hasUpper && hasLower && hasNumber
}

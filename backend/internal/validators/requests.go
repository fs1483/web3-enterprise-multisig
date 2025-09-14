package validators

// 请求结构体定义
type RegisterRequest struct {
    Email         string  `json:"email" validate:"required,email"`
    Name          string  `json:"name" validate:"required,min=2,max=255"`
    Password      string  `json:"password" validate:"required,min=6"`
    WalletAddress *string `json:"wallet_address" validate:"omitempty,ethereum_address"`
}

type LoginRequest struct {
    Email    string `json:"email" validate:"required,email"`
    Password string `json:"password" validate:"required"`
}

type WalletLoginRequest struct {
    WalletAddress string `json:"wallet_address" validate:"required,ethereum_address"`
    Signature     string `json:"signature" validate:"required"`
    Message       string `json:"message" validate:"required"`
}

type WalletRegisterRequest struct {
    WalletAddress string `json:"wallet_address" validate:"required,ethereum_address"`
    Signature     string `json:"signature" validate:"required"`
    Message       string `json:"message" validate:"required"`
    Name          string `json:"name" validate:"required,min=2,max=255"`
    Email         string `json:"email" validate:"required,email"`
}

type CreateSafeRequest struct {
    Name        string   `json:"name" validate:"required,min=1,max=255"`
    Description string   `json:"description" validate:"max=1000"`
    Address     string   `json:"address" validate:"required,ethereum_address"`
    ChainID     int      `json:"chain_id" validate:"required,min=1"`
    Threshold   int      `json:"threshold" validate:"required,min=1"`
    Owners      []string `json:"owners" validate:"required,min=1,dive,ethereum_address"`
}

type CreateProposalRequest struct {
    SafeID             string `json:"safe_id" validate:"required,uuid"`
    Title              string `json:"title" validate:"required,min=1,max=255"`
    Description        string `json:"description" validate:"max=1000"`
    ProposalType       string `json:"proposal_type" validate:"required,oneof=transfer contract_call add_owner remove_owner change_threshold"`
    ToAddress          string `json:"to_address" validate:"required,ethereum_address"`
    Value              string `json:"value" validate:"required"`
    Data               string `json:"data"`
    RequiredSignatures int    `json:"required_signatures" validate:"required,min=1"`
}

type SignProposalRequest struct {
    SignatureData string `json:"signature_data" validate:"required"`
    SignatureType string `json:"signature_type" validate:"required,oneof=eth_sign eth_signTypedData contract"`
    UsedNonce     *int64 `json:"used_nonce"`     // 签名时使用的Safe nonce
    SafeTxHash    string `json:"safe_tx_hash"`   // 签名对应的Safe交易哈希
}

type UpdateProfileRequest struct {
    FullName      string `json:"full_name" validate:"max=255"`
    AvatarURL     string `json:"avatar_url" validate:"omitempty,url"`
    WalletAddress string `json:"wallet_address" validate:"omitempty,eth_addr"`
}

// ValidateStruct 验证结构体
func ValidateStruct(s interface{}) error {
    return validate.Struct(s)
}

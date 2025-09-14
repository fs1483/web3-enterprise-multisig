package blockchain

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"log"
	"math/big"
	"os"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
)

type EthereumClient struct {
	client     *ethclient.Client
	chainID    *big.Int
	privateKey *ecdsa.PrivateKey
	auth       *bind.TransactOpts
}

type NetworkConfig struct {
	ChainID  int64
	RPCUrl   string
	Name     string
	GasLimit uint64
	GasPrice *big.Int
}

var (
	SepoliaConfig = NetworkConfig{
		ChainID:  11155111,
		RPCUrl:   "https://sepolia.infura.io/v3/" + os.Getenv("INFURA_PROJECT_ID"),
		Name:     "Sepolia",
		GasLimit: 6000000,
		GasPrice: big.NewInt(20000000000), // 20 Gwei
	}

	LocalConfig = NetworkConfig{
		ChainID:  31337,
		RPCUrl:   "http://localhost:8545",
		Name:     "Localhost",
		GasLimit: 6000000,
		GasPrice: big.NewInt(20000000000),
	}
)

func NewEthereumClient(config NetworkConfig) (*EthereumClient, error) {
	// 连接到以太坊节点
	client, err := ethclient.Dial(config.RPCUrl)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Ethereum client: %w", err)
	}

	// 验证连接
	chainID, err := client.ChainID(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to get chain ID: %w", err)
	}

	if chainID.Int64() != config.ChainID {
		return nil, fmt.Errorf("chain ID mismatch: expected %d, got %d",
			config.ChainID, chainID.Int64())
	}

	log.Printf("✅ Connected to %s (Chain ID: %d)", config.Name, chainID.Int64())

	return &EthereumClient{
		client:  client,
		chainID: chainID,
	}, nil
}

func (ec *EthereumClient) GetBalance(address common.Address) (*big.Int, error) {
	balance, err := ec.client.BalanceAt(context.Background(), address, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get balance: %w", err)
	}

	return balance, nil
}

func (ec *EthereumClient) GetTransactionReceipt(txHash common.Hash) (*types.Receipt, error) {
	receipt, err := ec.client.TransactionReceipt(context.Background(), txHash)
	if err != nil {
		return nil, fmt.Errorf("failed to get transaction receipt: %w", err)
	}

	return receipt, nil
}

func (ec *EthereumClient) WaitForTransaction(txHash common.Hash, timeout time.Duration) (*types.Receipt, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil, fmt.Errorf("timeout waiting for transaction %s", txHash.Hex())
		case <-ticker.C:
			receipt, err := ec.client.TransactionReceipt(context.Background(), txHash)
			if err == nil {
				return receipt, nil
			}
			// 继续等待
		}
	}
}

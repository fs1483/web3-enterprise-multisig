// 密码哈希生成工具
// 使用方法: 在后端目录运行 go run ../database/scripts/generateHasjPwd.go
// 
// 注意: 此文件需要在有 go.mod 的目录中运行，因为它依赖 golang.org/x/crypto/bcrypt
// 
// 生成的密码哈希:
// 密码: Demo@123456
// 哈希: $2a$10$lYymMsMzRXLYKpzD7TIeteJegACHRJSjbuRUaa392EfV7Vg0sYMBq
//
// 已经生成的哈希值可以直接在 SQL 脚本中使用，无需重新运行此工具

package main

// 注释掉代码以避免 linter 错误，因为此目录没有 go.mod
// 如需使用，请在后端目录运行: go run ../database/scripts/generateHasjPwd.go

/*
import (
	"fmt"
	"log"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	password := "Demo@123456"
	
	// 使用与后端相同的成本参数
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal("密码哈希失败:", err)
	}
	
	fmt.Printf("密码: %s\n", password)
	fmt.Printf("哈希: %s\n", string(hashedPassword))
	
	// 验证哈希是否正确
	err = bcrypt.CompareHashAndPassword(hashedPassword, []byte(password))
	if err != nil {
		log.Fatal("密码验证失败:", err)
	}
	
	fmt.Println("✅ 密码哈希验证成功")
}
*/

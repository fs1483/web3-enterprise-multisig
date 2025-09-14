import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, User } from 'lucide-react';

interface User {
  id: string;
  name: string;
  wallet_address: string;
}

interface UserSelectInputProps {
  value: string;
  onChange: (value: string) => void;
  onUserSelect?: (user: User) => void;
  placeholder?: string;
  users: User[];
}

export const UserSelectInput: React.FC<UserSelectInputProps> = ({
  value,
  onChange,
  onUserSelect,
  placeholder = "输入名称或选择用户",
  users
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<User[]>(users);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 过滤用户列表
  useEffect(() => {
    if (value.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user =>
        user.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [value, users]);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
  };

  const handleUserSelect = (user: User) => {
    onChange(user.name);
    setIsOpen(false);
    if (onUserSelect) {
      onUserSelect(user);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleDropdownToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      inputRef.current?.focus();
    }
  };

  return (
    <div 
      ref={dropdownRef}
      style={{
        position: 'relative',
        width: '100%'
      }}
    >
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '0.5rem 2.5rem 0.5rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            outline: 'none',
            transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
          }}
          onFocus={(e) => {
            handleInputFocus();
            e.target.style.borderColor = '#3b82f6';
            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#d1d5db';
            e.target.style.boxShadow = 'none';
          }}
        />
        <button
          type="button"
          onClick={handleDropdownToggle}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            padding: '0 0.75rem',
            color: '#9ca3af',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'color 0.15s ease-in-out'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#6b7280';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#9ca3af';
          }}
        >
          <ChevronDown 
            style={{
              width: '1rem',
              height: '1rem',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease-in-out'
            }}
          />
        </button>
      </div>

      {isOpen && (
        <div 
          style={{ 
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 99999,
            marginTop: '0.5rem',
            backgroundColor: '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            maxHeight: '12rem',
            overflowY: 'auto',
            width: '100%',
            minHeight: '3rem'
          }}
        >
          {filteredUsers.length > 0 ? (
            <div style={{ padding: '0.25rem 0' }}>
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleUserSelect(user)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid #f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease-in-out',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#eff6ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.backgroundColor = '#eff6ff';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div 
                    style={{
                      flexShrink: 0,
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <User style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div 
                      style={{ 
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#1f2937',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {user.name}
                    </div>
                    <div 
                      style={{ 
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                        marginTop: '0.25rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {user.wallet_address}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div 
              style={{ 
                padding: '1.5rem 1rem',
                fontSize: '0.875rem',
                color: '#9ca3af',
                textAlign: 'center'
              }}
            >
              {value.trim() ? '未找到匹配的用户' : '暂无可选用户'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserSelectInput;

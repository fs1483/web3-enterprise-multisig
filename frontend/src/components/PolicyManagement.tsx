import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
// import { PolicyService } from '../services/policyService'; // Temporarily disabled to use mock data
import type { Policy, PolicyTemplate } from '../services/policyService';

const PolicyManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'policies' | 'templates'>('policies');
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [templates, setTemplates] = useState<PolicyTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    type: 'approval_threshold',
    description: '',
    parameters: '{}',
    is_active: true
  });

  useEffect(() => {
    loadPolicies();
    loadTemplates();
  }, []);

  const loadPolicies = async () => {
    setLoading(true);
    try {
      // TEMPORARY FIX: Using mock data to resolve 404/401 API errors
      // TODO: Replace with real API calls once backend is properly configured
      // Original API call: await PolicyService.getSafePolicies(safeId)
      const mockPolicies: Policy[] = [
        {
          id: '1',
          safe_id: 'safe-1',
          name: '多重签名阈值策略',
          policy_type: 'approval_threshold',
          description: '要求至少3个签名者批准交易',
          parameters: { threshold: 3, total_signers: 5 },
          is_active: true,
          created_by: 'user1',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z'
        },
        {
          id: '2',
          safe_id: 'safe-1',
          name: '交易金额限制策略',
          policy_type: 'amount_limit',
          description: '单笔交易不能超过1000 ETH',
          parameters: { max_amount: '1000', currency: 'ETH' },
          is_active: true,
          created_by: 'user1',
          created_at: '2024-01-16T14:30:00Z',
          updated_at: '2024-01-16T14:30:00Z'
        }
      ];
      setPolicies(mockPolicies);
      setError(null);
    } catch (err) {
      setError('加载策略失败');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      // TEMPORARY FIX: Using mock data to resolve 404/401 API errors
      // TODO: Replace with real API calls once backend is properly configured
      // Original API call: await PolicyService.getPolicyTemplates()
      const mockTemplates: PolicyTemplate[] = [
        {
          id: '1',
          name: '标准多重签名',
          policy_type: 'approval_threshold',
          description: '标准的多重签名策略模板',
          category: 'security',
          default_params: { threshold: 2, total_signers: 3 },
          is_public: true,
          created_by: 'system',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          name: '金额限制',
          policy_type: 'amount_limit',
          description: '交易金额限制策略模板',
          category: 'financial',
          default_params: { max_amount: '100', currency: 'ETH' },
          is_public: true,
          created_by: 'system',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];
      setTemplates(mockTemplates);
      setError(null);
    } catch (err) {
      setError('加载模板失败');
    }
  };

  const handleCreatePolicy = async () => {
    try {
      setLoading(true);
      // TEMPORARY FIX: Creating mock policy locally to avoid API errors
      // TODO: Replace with real API call once backend is properly configured
      // Original API call: await PolicyService.createSafePolicy(safeId, policyData)
      const newPolicy: Policy = {
        id: Date.now().toString(),
        safe_id: 'safe-1',
        name: formData.name,
        policy_type: formData.type,
        description: formData.description,
        parameters: JSON.parse(formData.parameters),
        is_active: formData.is_active,
        created_by: 'current-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setPolicies(prev => [...prev, newPolicy]);
      setShowCreateModal(false);
      resetForm();
      setError(null);
    } catch (err) {
      setError('创建策略失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPolicy = async () => {
    if (!selectedPolicy) return;
    
    try {
      setLoading(true);
      const updatedPolicy = {
        ...selectedPolicy,
        ...formData,
        parameters: JSON.parse(formData.parameters),
        updated_at: new Date().toISOString()
      };
      
      setPolicies(policies.map(p => p.id === selectedPolicy.id ? updatedPolicy : p));
      setShowEditModal(false);
      setSelectedPolicy(null);
      resetForm();
    } catch (err) {
      setError('Failed to update policy');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePolicy = async (policyId: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;
    
    try {
      setLoading(true);
      setPolicies(policies.filter(p => p.id !== policyId));
    } catch (err) {
      setError('Failed to delete policy');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePolicy = async (policyId: string) => {
    try {
      const policy = policies.find(p => p.id === policyId);
      if (!policy) return;
      
      const updatedPolicy = {
        ...policy,
        is_active: !policy.is_active,
        updated_at: new Date().toISOString()
      };
      
      setPolicies(policies.map(p => p.id === policyId ? updatedPolicy : p));
    } catch (err) {
      setError('Failed to toggle policy status');
    }
  };

  const openEditModal = (policy: Policy) => {
    setSelectedPolicy(policy);
    setFormData({
      name: policy.name,
      type: policy.policy_type,
      description: policy.description || '',
      parameters: JSON.stringify(policy.parameters, null, 2),
      is_active: policy.is_active
    });
    setShowEditModal(true);
  };


  const resetForm = () => {
    setFormData({
      name: '',
      type: 'approval_threshold',
      description: '',
      parameters: '{}',
      is_active: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getPolicyTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'approval_threshold': 'bg-blue-100 text-blue-800',
      'time_lock': 'bg-yellow-100 text-yellow-800',
      'spending_limit': 'bg-green-100 text-green-800',
      'role_based_approval': 'bg-purple-100 text-purple-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Policy Management</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          Create Policy
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('policies')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'policies'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Active Policies
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Policy Templates
          </button>
        </nav>
      </div>

      {/* Policies Tab */}
      {activeTab === 'policies' && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Active Policies</h3>
            {loading ? (
              <div className="text-center py-4">Loading policies...</div>
            ) : policies.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No policies found. Create your first policy to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {policies.map((policy) => (
                      <tr key={policy.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {policy.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {policy.description}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPolicyTypeColor(policy.policy_type)}`}>
                            {policy.policy_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleTogglePolicy(policy.id)}
                          >
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              policy.policy_type === 'approval_threshold' ? 'bg-blue-100 text-blue-800' :
                              policy.policy_type === 'amount_limit' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {policy.policy_type}
                            </span>
                            {policy.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(policy.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(policy)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeletePolicy(policy.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Policy Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div key={template.id} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">{template.name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPolicyTypeColor(template.policy_type)} mb-3`}>
                    {template.policy_type.replace('_', ' ')}
                  </span>
                  <div className="mt-3">
                    <Button
                      size="sm"
                      onClick={() => {
                        setFormData({
                          name: template.name,
                          type: template.policy_type,
                          description: template.description,
                          parameters: JSON.stringify(template.default_params, null, 2),
                          is_active: true
                        });
                        setShowCreateModal(true);
                      }}
                    >
                      Use Template
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Create Policy Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Create New Policy"
      >
        <div className="space-y-4">
          <Input
            label="Policy Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter policy name"
          />
          
          <Select
            label="Policy Type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            options={[
              { value: 'approval_threshold', label: 'Approval Threshold' },
              { value: 'time_lock', label: 'Time Lock' },
              { value: 'spending_limit', label: 'Spending Limit' },
              { value: 'role_based_approval', label: 'Role-based Approval' }
            ]}
          />
          
          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter policy description"
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parameters (JSON)
            </label>
            <textarea
              value={formData.parameters}
              onChange={(e) => setFormData({ ...formData, parameters: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder='{"key": "value"}'
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
              Active
            </label>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <Button
            variant="outline"
            onClick={() => {
              setShowCreateModal(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleCreatePolicy} disabled={loading}>
            {loading ? 'Creating...' : 'Create Policy'}
          </Button>
        </div>
      </Modal>

      {/* Edit Policy Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedPolicy(null);
          resetForm();
        }}
        title="Edit Policy"
      >
        <div className="space-y-4">
          <Input
            label="Policy Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter policy name"
          />
          
          <Select
            label="Policy Type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            options={[
              { value: 'approval_threshold', label: 'Approval Threshold' },
              { value: 'time_lock', label: 'Time Lock' },
              { value: 'spending_limit', label: 'Spending Limit' },
              { value: 'role_based_approval', label: 'Role-based Approval' }
            ]}
          />
          
          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter policy description"
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parameters (JSON)
            </label>
            <textarea
              value={formData.parameters}
              onChange={(e) => setFormData({ ...formData, parameters: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder='{"key": "value"}'
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="edit_is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="edit_is_active" className="ml-2 block text-sm text-gray-900">
              Active
            </label>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <Button
            variant="outline"
            onClick={() => {
              setShowEditModal(false);
              setSelectedPolicy(null);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleEditPolicy} disabled={loading}>
            {loading ? 'Updating...' : 'Update Policy'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default PolicyManagement;

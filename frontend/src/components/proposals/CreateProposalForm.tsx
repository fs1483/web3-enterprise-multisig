import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { useProposalStore } from '../../stores/proposalStore';
import type { CreateProposalData } from '../../stores/proposalStore';
import { useAuthStore } from '../../stores/authStore';
import { useSafeStore } from '../../stores/safeStore';
import { validateEthAmount, ETH_INPUT_SUGGESTIONS } from '../../utils/ethUtils';

const proposalSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  type: z.enum(['transfer', 'contract_call', 'add_owner', 'remove_owner', 'change_threshold']),
  safeId: z.string().min(1, 'Safe wallet is required'),
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format'),
  value: z.string().refine((val) => {
    const validation = validateEthAmount(val);
    return validation.isValid;
  }, 'Invalid ETH amount format'),
  data: z.string().optional(),
  requiredSignatures: z.number().min(1, 'Required signatures must be at least 1'),
});

type ProposalFormData = z.infer<typeof proposalSchema>;

interface CreateProposalFormProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export const CreateProposalForm: React.FC<CreateProposalFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { createProposal, isLoading } = useProposalStore();
  const { user } = useAuthStore();
  const { safes, fetchSafes, isLoading: safesLoading } = useSafeStore();

  // 提前预加载Safe数据 - 在组件挂载时立即开始加载
  useEffect(() => {
    console.log('Component mounted, starting Safe data preload');
    if (user?.id && !safesLoading) {
      fetchSafes().catch(console.error);
    }
  }, [user?.id]); // 简化依赖，只依赖user.id

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue,
  } = useForm<ProposalFormData>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      type: 'transfer',
      value: '0',
      data: '0x',
      safeId: '', // 添加safeId默认值，避免undefined触发校验
      title: '',
      description: '',
      to: '',
      requiredSignatures: 1,
    },
  });

  // 当Safe数据加载完成后，自动设置第一个Safe为默认值
  useEffect(() => {
    if (safes && safes.length > 0 && !watch('safeId')) {
      console.log('Setting default Safe:', safes[0].id);
      setValue('safeId', safes[0].id, { shouldValidate: true });
    }
  }, [safes, setValue, watch]);

  const proposalType = watch('type');

  const onSubmit = async (data: z.infer<typeof proposalSchema>) => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    try {
      // 映射表单字段到 CreateProposalData 接口
      const proposalData: CreateProposalData = {
        safeId: data.safeId,
        title: data.title,
        description: data.description,
        proposalType: data.type,
        toAddress: data.to,
        value: data.value,
        data: data.data || '0x',
        requiredSignatures: data.requiredSignatures,
      };

      console.log('Creating proposal with data:', proposalData);
      
      const result = await createProposal(proposalData);
      
      // 检查创建是否成功
      if (result) {
        console.log('Proposal created successfully');
        
        // 重置表单
        reset();
        
        // 调用成功回调
        onSuccess();
      } else {
        console.error('Failed to create proposal: No result returned');
        // 不调用onSuccess，保持在当前页面
      }
      
    } catch (error) {
      console.error('Failed to create proposal:', error);
      // 不调用onSuccess，保持在当前页面
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <div>
          <Input
            label="Proposal Title"
            {...register('title')}
            error={errors.title?.message}
            placeholder="e.g., Transfer funds to marketing team"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Proposal Type"
            {...register('type')}
            error={errors.type?.message}
            options={[
              { value: 'transfer', label: '💸 Transfer Funds' },
              { value: 'contract_call', label: '📋 Contract Call' },
              { value: 'add_owner', label: '👥 Add Owner' },
              { value: 'remove_owner', label: '👤 Remove Owner' },
              { value: 'change_threshold', label: '🔢 Change Threshold' }
            ]}
          />

          <Select
            label="Select Safe Wallet"
            {...register('safeId')}
            error={errors.safeId?.message}
            disabled={safesLoading}
            placeholder="Choose your Safe wallet"
            options={
              safesLoading 
                ? [{ value: '', label: '🔄 Loading Safes...', disabled: true }]
                : safes && Array.isArray(safes) && safes.length > 0 
                  ? safes.map((safe) => ({
                      value: safe.id || '',
                      label: `${safe.name || 'Unnamed Safe'} (${safe.address?.slice(0, 6) || '0x'}...${safe.address?.slice(-4) || ''}) - ${safe.threshold || 1}/${Array.isArray(safe.owners) ? safe.owners.length : 0} signatures`
                    }))
                  : [{ value: '', label: '❌ No Safe wallets available', disabled: true }]
            }
          />
        </div>

        <Textarea
          label="Description"
          {...register('description')}
          error={errors.description?.message}
          rows={4}
          placeholder="Provide a detailed description of this proposal..."
        />
      </div>

      {/* Transaction Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Transaction Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Input
              label="To Address"
              {...register('to')}
              error={errors.to?.message}
              placeholder="0x742d35Cc6634C0532925a3b8D8C0532925a3b8D8"
            />
          </div>

          <div>
            <Input
              label="Value (ETH)"
              {...register('value')}
              error={errors.value?.message}
              placeholder="0.001"
              step="0.001"
              type="number"
              min="0"
              helperText={`Minimum: ${ETH_INPUT_SUGGESTIONS.MIN_TRANSFER_AMOUNT} ETH. Common amounts: ${ETH_INPUT_SUGGESTIONS.COMMON_AMOUNTS.join(', ')} ETH`}
            />
          </div>
        </div>

        <div>
          <Input
            label="Required Signatures"
            type="number"
            {...register('requiredSignatures', { valueAsNumber: true })}
            error={errors.requiredSignatures?.message}
            placeholder="2"
            min="1"
            helperText="Number of signatures required to execute this proposal"
          />
        </div>

        {(proposalType === 'contract_call' || proposalType === 'add_owner' || 
          proposalType === 'remove_owner' || proposalType === 'change_threshold') && (
          <Textarea
            label="Transaction Data (Hex)"
            {...register('data')}
            error={errors.data?.message}
            rows={3}
            className="font-mono"
            placeholder="0x1234567890abcdef..."
            helperText="Contract call data or encoded parameters for advanced operations"
          />
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-end pt-6">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
        >
          Create Proposal
        </Button>
      </div>
    </form>
  );
};

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CreateProposalForm } from '../../components/proposals/CreateProposalForm';

export const CreateProposalPage: React.FC = () => {
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => {
      navigate('/proposals');
    }, 2000);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (showSuccess) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center">
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Proposal Created Successfully!
              </h2>
              <p className="text-gray-600 mb-4">
                Your proposal has been submitted and is now pending approval from other signers.
              </p>
              <div className="text-sm text-gray-500">
                Redirecting to proposals page...
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
              <FileText className="h-8 w-8 mr-3 text-blue-600" />
              Create New Proposal
            </h1>
            <p className="text-gray-600 mt-1">
              Submit a new proposal for multisig wallet actions
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Important Information</p>
                <ul className="space-y-1 text-blue-700">
                  <li>• All proposals require the specified number of signatures before execution</li>
                  <li>• Make sure to double-check all addresses and amounts before submitting</li>
                  <li>• Contract calls require proper data encoding</li>
                  <li>• You can track the proposal status in the Proposals section</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create Proposal Form */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
            <CardTitle className="text-xl font-semibold text-gray-800">
              Proposal Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <CreateProposalForm
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-4">
            <h3 className="font-medium text-gray-900 mb-2">Proposal Types</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <p className="font-medium text-gray-800">Transfer</p>
                <p>Send ETH or tokens to another address</p>
              </div>
              <div>
                <p className="font-medium text-gray-800">Contract Call</p>
                <p>Execute a function on a smart contract</p>
              </div>
              <div>
                <p className="font-medium text-gray-800">Add Owner</p>
                <p>Add a new signer to the multisig wallet</p>
              </div>
              <div>
                <p className="font-medium text-gray-800">Remove Owner</p>
                <p>Remove an existing signer from the wallet</p>
              </div>
              <div>
                <p className="font-medium text-gray-800">Change Threshold</p>
                <p>Modify the required number of signatures</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

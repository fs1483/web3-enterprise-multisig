import React from 'react';
import { Layout } from '../components/layout/Layout';
import UserSettings from '../components/UserSettings';

export const SettingsPage: React.FC = () => {
  return (
    <Layout>
      <UserSettings />
    </Layout>
  );
};

export default SettingsPage;

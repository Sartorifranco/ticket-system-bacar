// src/pages/Admin/ReportsPage.tsx
import React from 'react';
import Layout from '../../components/Layout/Layout';
import Reports from '../../components/Dashboard/ReportsDashboard'; // Asumo que ReportsDashboard es el componente de reportes

const ReportsPage: React.FC = () => {
    return (
        <Layout>
            <Reports />
        </Layout>
    );
};

export default ReportsPage;

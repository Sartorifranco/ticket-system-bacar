// frontend/src/components/Dashboard/ChartDetailModal.tsx
import React from 'react';
import ReactDOM from 'react-dom';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: { name: string; value: number }[];
}

// Colors for the pie chart segments (you can customize these)
const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ff7300'];

const CustomPieChartLabel = ({ cx, cy, midAngle, outerRadius, percent, name, value }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 10; // Distance of the text from the center
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="var(--text-color)" // Label text color
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-sm" // Font size class
    >
      {`${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

const ChartDetailModal: React.FC<ChartDetailModalProps> = ({ isOpen, onClose, title, data }) => {
  if (!isOpen) return null;

  const portalElement = document.getElementById('modal-root');
  if (!portalElement) {
    console.error("Error: 'modal-root' not found for ChartDetailModal. The portal cannot be created.");
    return null;
  }

  return ReactDOM.createPortal(
    <div className="modal-overlay">
      <div className="modal-content chart-detail-modal-content">
        <h2 className="modal-title">{title}</h2>
        <button className="modal-close-button" onClick={onClose}>&times;</button>

        <div className="chart-container-modal" style={{ width: '100%', height: '300px' }}>
          {data && data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={120} // Chart radius
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={CustomPieChartLabel}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border-color)', color: 'var(--text-color)' }}
                  itemStyle={{ color: 'var(--text-color)' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="info-text" style={{ textAlign: 'center', marginTop: '50px' }}>No hay datos disponibles para este gráfico.</p>
          )}
        </div>
      </div>
    </div>,
    portalElement
  );
};

export default ChartDetailModal;

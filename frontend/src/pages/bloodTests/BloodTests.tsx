import React, { useState } from 'react';
import { BloodTest } from '../../types';
import BloodTestForm from '../../components/bloodTest/BloodTestForm';
import BloodTestList from '../../components/bloodTest/BloodTestList';
import './BloodTests.css';

type ViewMode = 'list' | 'add' | 'edit';

const BloodTests: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingTest, setEditingTest] = useState<BloodTest | undefined>(
    undefined
  );
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAddNew = () => {
    setEditingTest(undefined);
    setViewMode('add');
  };

  const handleEdit = (bloodTest: BloodTest) => {
    setEditingTest(bloodTest);
    setViewMode('edit');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这条记录吗？此操作无法撤销。')) {
      try {
        const { default: bloodTestService } = await import(
          '../../services/bloodTest/bloodTestService'
        );
        await bloodTestService.deleteBloodTest(id);
        setRefreshTrigger(prev => prev + 1);
      } catch (err: any) {
        alert('删除失败: ' + (err.message || '请重试'));
      }
    }
  };

  const handleSubmitSuccess = () => {
    setViewMode('list');
    setEditingTest(undefined);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingTest(undefined);
  };

  return (
    <div className="blood-tests-page">
      <div className="page-header">
        <h1>血常规记录</h1>
        {viewMode === 'list' && (
          <button className="btn btn-primary" onClick={handleAddNew}>
            + 添加记录
          </button>
        )}
      </div>

      <div className="page-content">
        {viewMode === 'list' && (
          <BloodTestList
            onEdit={handleEdit}
            onDelete={handleDelete}
            refreshTrigger={refreshTrigger}
          />
        )}

        {(viewMode === 'add' || viewMode === 'edit') && (
          <BloodTestForm
            initialData={editingTest}
            onSubmitSuccess={handleSubmitSuccess}
            onCancel={handleCancel}
          />
        )}
      </div>

      <div className="info-cards">
        <div className="info-card">
          <h4>💡 提示</h4>
          <p>定期记录血常规数据有助于追踪治疗效果。建议化疗前后都进行检测。</p>
        </div>
        <div className="info-card">
          <h4>⚠️ 注意</h4>
          <p>如果检测结果显示异常指标，请及时咨询您的主治医生。</p>
        </div>
        <div className="info-card">
          <h4>📊 数据安全</h4>
          <p>您的健康数据已加密存储，只有您可以访问自己的记录。</p>
        </div>
      </div>
    </div>
  );
};

export default BloodTests;

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import BloodTests from '../BloodTests';
import bloodTestService from '../../../services/bloodTest/bloodTestService';
import chemoCycleService from '../../../services/chemoCycle/chemoCycleService';
import { ApiError } from '../../../services/api/apiClient';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: null }),
}));

// 把列表/表单子组件桩成轻量假组件，专注测页面级编排
jest.mock('../../../components/bloodTest/BloodTestList', () => {
  const MockList = ({
    onEdit,
    onDelete,
  }: {
    onEdit: (t: { _id: string; date: string }) => void;
    onDelete: (id: string) => void;
  }) => (
    <div data-testid="mock-list">
      <button onClick={() => onEdit({ _id: 't1', date: '2024-01-01' })}>
        触发编辑
      </button>
      <button onClick={() => onDelete('t1')}>触发删除</button>
    </div>
  );
  return { __esModule: true, default: MockList };
});

jest.mock('../../../components/bloodTest/BloodTestForm', () => {
  const MockForm = ({
    onSubmitSuccess,
    onCancel,
    beforeSubmit,
  }: {
    onSubmitSuccess: () => void;
    onCancel: () => void;
    beforeSubmit?: (data: { date: string }) => Promise<'continue' | 'cancel'>;
  }) => (
    <div data-testid="mock-form">
      <button
        onClick={async () => {
          const decision = beforeSubmit
            ? await beforeSubmit({ date: '2026-07-01' })
            : 'continue';
          if (decision === 'continue') onSubmitSuccess();
        }}
      >
        表单提交成功
      </button>
      <button onClick={onCancel}>表单取消</button>
    </div>
  );
  return { __esModule: true, default: MockForm };
});

jest.mock('../../../services/bloodTest/bloodTestService', () => ({
  __esModule: true,
  default: {
    deleteBloodTest: jest.fn(),
    exportCsv: jest.fn(),
  },
}));

jest.mock('../../../services/chemoCycle/chemoCycleService', () => ({
  __esModule: true,
  default: {
    getChemoCycles: jest.fn().mockResolvedValue({
      success: true,
      data: [{ _id: 'c1', regimenName: 'VAC方案', startDate: '2026-06-20' }],
      pagination: { page: 1, limit: 100, total: 1, pages: 1 },
    }),
  },
}));

describe('BloodTests page', () => {
  let confirmSpy: jest.SpyInstance;
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    (chemoCycleService.getChemoCycles as jest.Mock).mockResolvedValue({
      success: true,
      data: [{ _id: 'c1', regimenName: 'VAC方案', startDate: '2026-06-20' }],
      pagination: { page: 1, limit: 100, total: 1, pages: 1 },
    });
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    confirmSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it('默认渲染列表视图与导出/添加按钮', () => {
    render(<BloodTests />);
    expect(screen.getByText('血常规记录')).toBeInTheDocument();
    expect(screen.getByText('+ 添加记录')).toBeInTheDocument();
    expect(screen.getByText('⬇ 导出 CSV')).toBeInTheDocument();
    expect(screen.getByTestId('mock-list')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-form')).not.toBeInTheDocument();
  });

  it('点击 "+ 添加记录" 切到表单视图，导出按钮消失', async () => {
    render(<BloodTests />);
    await userEvent.click(screen.getByText('+ 添加记录'));
    expect(screen.getByTestId('mock-form')).toBeInTheDocument();
    expect(screen.queryByText('+ 添加记录')).not.toBeInTheDocument();
    expect(screen.queryByText('⬇ 导出 CSV')).not.toBeInTheDocument();
  });

  it('没有化疗周期时保存前提醒，可选择去添加周期并取消保存', async () => {
    (chemoCycleService.getChemoCycles as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: [],
      pagination: { page: 1, limit: 100, total: 0, pages: 0 },
    });
    confirmSpy.mockReturnValueOnce(true);

    render(<BloodTests />);
    await userEvent.click(screen.getByText('+ 添加记录'));
    await userEvent.click(screen.getByText('表单提交成功'));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining('建议先添加化疗周期记录')
      );
    });
    expect(screen.getByTestId('mock-form')).toBeInTheDocument();
  });

  it('没有化疗周期时选择仍然保存会回到列表', async () => {
    (chemoCycleService.getChemoCycles as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: [],
      pagination: { page: 1, limit: 100, total: 0, pages: 0 },
    });
    confirmSpy.mockReturnValueOnce(false);

    render(<BloodTests />);
    await userEvent.click(screen.getByText('+ 添加记录'));
    await userEvent.click(screen.getByText('表单提交成功'));

    await waitFor(() => {
      expect(screen.getByTestId('mock-list')).toBeInTheDocument();
    });
  });

  it('最近周期超过21天时保存前提醒', async () => {
    (chemoCycleService.getChemoCycles as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: [{ _id: 'old', regimenName: '旧方案', startDate: '2026-05-01' }],
      pagination: { page: 1, limit: 100, total: 1, pages: 1 },
    });
    confirmSpy.mockReturnValueOnce(false);

    render(<BloodTests />);
    await userEvent.click(screen.getByText('+ 添加记录'));
    await userEvent.click(screen.getByText('表单提交成功'));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining('超过 21 天')
      );
    });
  });

  it('表单取消后回到列表视图', async () => {
    render(<BloodTests />);
    await userEvent.click(screen.getByText('+ 添加记录'));
    await userEvent.click(screen.getByText('表单取消'));
    expect(screen.getByTestId('mock-list')).toBeInTheDocument();
  });

  it('点击列表中的 "触发编辑" 切到编辑表单', async () => {
    render(<BloodTests />);
    await userEvent.click(screen.getByText('触发编辑'));
    expect(screen.getByTestId('mock-form')).toBeInTheDocument();
  });

  it('删除流程: confirm=true → 调用 deleteBloodTest', async () => {
    (bloodTestService.deleteBloodTest as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: 'ok',
    });
    render(<BloodTests />);
    await userEvent.click(screen.getByText('触发删除'));
    await waitFor(() => {
      expect(bloodTestService.deleteBloodTest).toHaveBeenCalledWith('t1');
    });
  });

  it('删除流程: confirm=false 时不调用接口', async () => {
    confirmSpy.mockReturnValueOnce(false);
    render(<BloodTests />);
    await userEvent.click(screen.getByText('触发删除'));
    expect(bloodTestService.deleteBloodTest).not.toHaveBeenCalled();
  });

  it('删除失败 (ApiError) 时弹窗显示后端 message', async () => {
    (bloodTestService.deleteBloodTest as jest.Mock).mockRejectedValueOnce(
      new ApiError(403, '无权限')
    );
    render(<BloodTests />);
    await userEvent.click(screen.getByText('触发删除'));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('删除失败: 无权限');
    });
  });

  it('导出 CSV 调用 exportCsv 并显示 loading 文本', async () => {
    let resolveExport: () => void = () => {};
    (bloodTestService.exportCsv as jest.Mock).mockReturnValueOnce(
      new Promise<void>(resolve => {
        resolveExport = resolve;
      })
    );
    render(<BloodTests />);
    await userEvent.click(screen.getByText('⬇ 导出 CSV'));
    await waitFor(() => {
      expect(screen.getByText('导出中...')).toBeInTheDocument();
    });
    resolveExport();
    await waitFor(() => {
      expect(bloodTestService.exportCsv).toHaveBeenCalled();
    });
  });

  it('导出失败时弹窗', async () => {
    (bloodTestService.exportCsv as jest.Mock).mockRejectedValueOnce(
      new ApiError(500, '导出服务异常')
    );
    render(<BloodTests />);
    await userEvent.click(screen.getByText('⬇ 导出 CSV'));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('导出服务异常');
    });
  });
});

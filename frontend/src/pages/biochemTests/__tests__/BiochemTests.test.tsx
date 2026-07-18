import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import BiochemTests from '../BiochemTests';
import biochemService from '../../../services/biochem/biochemService';
import { ApiError } from '../../../services/api/apiClient';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: null }),
}));

// 桩成轻量假组件，专注测页面级编排
jest.mock('../../../components/biochem/BiochemList', () => {
  const MockList = ({
    onEdit,
    onDelete,
  }: {
    onEdit: (t: { _id: string; date: string }) => void;
    onDelete: (id: string) => void;
  }) => (
    <div data-testid="mock-list">
      <button onClick={() => onEdit({ _id: 'b1', date: '2026-07-01' })}>
        触发编辑
      </button>
      <button onClick={() => onDelete('b1')}>触发删除</button>
    </div>
  );
  return { __esModule: true, default: MockList };
});

jest.mock('../../../components/biochem/BiochemForm', () => {
  const MockForm = ({
    onSubmitSuccess,
    onCancel,
  }: {
    onSubmitSuccess: () => void;
    onCancel: () => void;
  }) => (
    <div data-testid="mock-form">
      <button onClick={onSubmitSuccess}>表单提交成功</button>
      <button onClick={onCancel}>表单取消</button>
    </div>
  );
  return { __esModule: true, default: MockForm };
});

jest.mock('../../../services/biochem/biochemService', () => ({
  __esModule: true,
  default: {
    deleteBiochemTest: jest.fn(),
    exportCsv: jest.fn(),
  },
}));

describe('BiochemTests page', () => {
  let confirmSpy: jest.SpyInstance;
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    confirmSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it('默认渲染列表视图与导出/添加按钮', () => {
    render(<BiochemTests />);
    expect(screen.getByText('生化检查')).toBeInTheDocument();
    expect(screen.getByText('+ 添加记录')).toBeInTheDocument();
    expect(screen.getByText('⬇ 导出 CSV')).toBeInTheDocument();
    expect(screen.getByTestId('mock-list')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-form')).not.toBeInTheDocument();
  });

  it('点击 "+ 添加记录" 切到表单视图，导出按钮消失', async () => {
    render(<BiochemTests />);
    await userEvent.click(screen.getByText('+ 添加记录'));
    expect(screen.getByTestId('mock-form')).toBeInTheDocument();
    expect(screen.queryByText('+ 添加记录')).not.toBeInTheDocument();
    expect(screen.queryByText('⬇ 导出 CSV')).not.toBeInTheDocument();
  });

  it('表单取消后回到列表视图', async () => {
    render(<BiochemTests />);
    await userEvent.click(screen.getByText('+ 添加记录'));
    await userEvent.click(screen.getByText('表单取消'));
    expect(screen.getByTestId('mock-list')).toBeInTheDocument();
  });

  it('表单提交成功后回到列表视图', async () => {
    render(<BiochemTests />);
    await userEvent.click(screen.getByText('+ 添加记录'));
    await userEvent.click(screen.getByText('表单提交成功'));
    expect(screen.getByTestId('mock-list')).toBeInTheDocument();
  });

  it('点击列表中的 "触发编辑" 切到编辑表单', async () => {
    render(<BiochemTests />);
    await userEvent.click(screen.getByText('触发编辑'));
    expect(screen.getByTestId('mock-form')).toBeInTheDocument();
  });

  it('删除流程: confirm=true -> 调用 deleteBiochemTest', async () => {
    (biochemService.deleteBiochemTest as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: 'ok',
    });
    render(<BiochemTests />);
    await userEvent.click(screen.getByText('触发删除'));
    await waitFor(() => {
      expect(biochemService.deleteBiochemTest).toHaveBeenCalledWith('b1');
    });
  });

  it('删除流程: confirm=false 时不调用接口', async () => {
    confirmSpy.mockReturnValueOnce(false);
    render(<BiochemTests />);
    await userEvent.click(screen.getByText('触发删除'));
    expect(biochemService.deleteBiochemTest).not.toHaveBeenCalled();
  });

  it('删除失败 (ApiError) 时弹窗显示后端 message', async () => {
    (biochemService.deleteBiochemTest as jest.Mock).mockRejectedValueOnce(
      new ApiError(403, '无权限')
    );
    render(<BiochemTests />);
    await userEvent.click(screen.getByText('触发删除'));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('删除失败: 无权限');
    });
  });

  it('导出 CSV 调用 exportCsv 并显示 loading 文本', async () => {
    let resolveExport!: (value: Blob) => void;
    (biochemService.exportCsv as jest.Mock).mockReturnValueOnce(
      new Promise<Blob>(resolve => {
        resolveExport = resolve;
      })
    );
    render(<BiochemTests />);
    await userEvent.click(screen.getByText('⬇ 导出 CSV'));
    await waitFor(() => {
      expect(screen.getByText('导出中...')).toBeInTheDocument();
    });
    resolveExport(new Blob());
    await waitFor(() => {
      expect(biochemService.exportCsv).toHaveBeenCalled();
    });
  });

  it('导出失败时弹窗', async () => {
    (biochemService.exportCsv as jest.Mock).mockRejectedValueOnce(
      new ApiError(500, '导出服务异常')
    );
    render(<BiochemTests />);
    await userEvent.click(screen.getByText('⬇ 导出 CSV'));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('导出服务异常');
    });
  });
});

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import OfflineIndicator from '../OfflineIndicator';

// jsdom 默认 navigator.onLine === true，因此组件初始渲染为「联网」态

describe('OfflineIndicator', () => {
  it('联网时不渲染任何提示', () => {
    const { container } = render(<OfflineIndicator />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/离线状态/)).not.toBeInTheDocument();
  });

  it('断网时渲染离线提示', () => {
    render(<OfflineIndicator />);
    // 模拟浏览器断网事件，act 确保状态更新 flush 后再断言
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByText(/您当前处于离线状态/)).toBeInTheDocument();
    expect(screen.getByText(/仅可查看已缓存的数据/)).toBeInTheDocument();
  });

  it('恢复联网后提示消失', () => {
    render(<OfflineIndicator />);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByText(/离线状态/)).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByText(/离线状态/)).not.toBeInTheDocument();
  });
});

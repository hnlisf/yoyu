/**
 * Toast 组件 smoke 测试
 */
import { render, screen } from '@testing-library/react';
import { Toast } from './Toast';

describe('Toast', () => {
  it('renders message', () => {
    render(<Toast message="操作成功" type="success" />);
    expect(screen.getByText('操作成功')).toBeInTheDocument();
  });

  it('applies type class', () => {
    const { container } = render(<Toast message="err msg" type="error" />);
    expect(container.querySelector('.toast-error')).toBeInTheDocument();
  });
});
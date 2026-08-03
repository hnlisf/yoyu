/**
 * CapacityBar 组件 smoke 测试
 */
import { render, screen } from '@testing-library/react';
import { CapacityBar } from './CapacityBar';

describe('CapacityBar', () => {
  it('renders with default props', () => {
    render(<CapacityBar size="medium" current={5} />);
    // Format: "{current}/{capacity}"  e.g. "5/12"
    expect(screen.getByText('5/12')).toBeInTheDocument();
  });

  it('renders different sizes', () => {
    const { rerender } = render(<CapacityBar size="small" current={2} />);
    expect(screen.getByText('2/6')).toBeInTheDocument();
    rerender(<CapacityBar size="large" current={20} />);
    expect(screen.getByText('20/30')).toBeInTheDocument();
  });
});
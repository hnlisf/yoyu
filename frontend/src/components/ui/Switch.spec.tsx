/**
 * Switch 组件 smoke 测试
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { Switch } from './Switch';

describe('Switch', () => {
  it('renders with off state by default', () => {
    render(<Switch checked={false} onChange={() => {}} ariaLabel="toggle" />);
    const sw = screen.getByRole('switch', { name: 'toggle' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
  });

  it('renders with on state', () => {
    render(<Switch checked={true} onChange={() => {}} ariaLabel="toggle" />);
    const sw = screen.getByRole('switch', { name: 'toggle' });
    expect(sw).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onChange when clicked', () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} ariaLabel="toggle" />);
    fireEvent.click(screen.getByRole('switch', { name: 'toggle' }));
    expect(onChange).toHaveBeenCalledWith(true);  // 翻转 false → true
  });
});
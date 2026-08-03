/**
 * Input 组件 smoke 测试
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  it('renders with placeholder', () => {
    render(<Input placeholder="Type here" />);
    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
  });

  it('accepts user input', () => {
    render(<Input aria-label="test input" />);
    const input = screen.getByLabelText('test input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'hello' } });
    expect(input.value).toBe('hello');
  });

  it('shows error state', () => {
    render(<Input error="invalid" aria-label="err" />);
    expect(screen.getByLabelText('err')).toBeInTheDocument();
  });
});
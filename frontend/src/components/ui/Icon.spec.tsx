/**
 * Icon 组件 smoke 测试
 */
import { render } from '@testing-library/react';
import { Icon } from './Icon';

describe('Icon', () => {
  it('renders an icon by valid name', () => {
    const { container } = render(<Icon name="fish" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders another valid icon name', () => {
    const { container } = render(<Icon name="back" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
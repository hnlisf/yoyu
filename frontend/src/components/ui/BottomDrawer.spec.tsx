/**
 * BottomDrawer 组件 smoke 测试
 */
import { render, screen } from '@testing-library/react';
import { BottomDrawer } from './BottomDrawer';

describe('BottomDrawer', () => {
  it('renders tabs', () => {
    render(
      <BottomDrawer
        tabs={[
          { label: 'Tab 1', content: <div>Content 1</div> },
          { label: 'Tab 2', content: <div>Content 2</div> },
        ]}
      />,
    );
    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 2')).toBeInTheDocument();
  });

  it('renders default tab content', () => {
    render(
      <BottomDrawer
        tabs={[
          { label: 'A', content: <div>AAA</div> },
          { label: 'B', content: <div>BBB</div> },
        ]}
        defaultTab={0}
      />,
    );
    expect(screen.getByText('AAA')).toBeInTheDocument();
  });
});
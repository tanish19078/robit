import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeProvider';

function ThemeControl() {
  const { theme, resolved, cycle } = useTheme();
  return (
    <button type="button" onClick={cycle}>
      {theme} / {resolved}
    </button>
  );
}

describe('ThemeProvider', () => {
  it('cycles system → light → dark → system and persists the selection', () => {
    render(
      <ThemeProvider>
        <ThemeControl />
      </ThemeProvider>,
    );
    const control = screen.getByRole('button');

    expect(control).toHaveTextContent('system / light');
    fireEvent.click(control);
    expect(control).toHaveTextContent('light / light');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(localStorage.getItem('prahari-theme')).toBe('light');

    fireEvent.click(control);
    expect(control).toHaveTextContent('dark / dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

    fireEvent.click(control);
    expect(control).toHaveTextContent('system / light');
    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });
});

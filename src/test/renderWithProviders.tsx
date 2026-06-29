import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

interface WrapperOptions {
  route?: string;
}

export function renderWithProviders(
  ui: ReactElement,
  { route = '/' }: WrapperOptions = {},
  renderOptions?: Omit<RenderOptions, 'wrapper'>
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

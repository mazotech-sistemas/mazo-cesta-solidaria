'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from './page';

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockSignInWithPassword = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    back: vi.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  }),
}));

const getForm = (container: RenderResult['container']) => container.querySelector('form') as HTMLFormElement;

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignInWithPassword.mockResolvedValue({ data: {}, error: null });
    mockPush.mockReset();
    mockRefresh.mockReset();
  });

  it('renderiza formulário de login com campos email e senha', () => {
    const { container } = render(<LoginPage />);
    expect(getForm(container)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('exibe título e branding da Cesta Solidária', () => {
    render(<LoginPage />);
    expect(screen.getByText('Cesta Solidária')).toBeInTheDocument();
    expect(screen.getByText('Gestão de cestas básicas para projetos sociais')).toBeInTheDocument();
    // Logo está no SVG com alt="Mazotech Sistemas"
    expect(screen.getByAltText('Mazotech Sistemas')).toBeInTheDocument();
  });

  it('exibe erro quando email não preenchido', async () => {
    const { container } = render(<LoginPage />);
    fireEvent.submit(getForm(container));
    await waitFor(() => {
      expect(screen.getByText('Preencha email e senha')).toBeInTheDocument();
    });
  });

  it('exibe erro quando senha não preenchida', async () => {
    const { container } = render(<LoginPage />);
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
    fireEvent.submit(getForm(container));
    await waitFor(() => {
      expect(screen.getByText('Preencha email e senha')).toBeInTheDocument();
    });
  });

  it('exibe erro para email inválido no campo', async () => {
    const { container } = render(<LoginPage />);
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'email-invalido' } });
    const passwordInput = screen.getByLabelText(/senha/i);
    fireEvent.change(passwordInput, { target: { value: 'senha123' } });
    fireEvent.submit(getForm(container));
    await waitFor(() => {
      expect(screen.getByText('Email inválido')).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-invalid', 'true');
    });
  });

  it('faz login com sucesso e redireciona para dashboard', async () => {
    const { container } = render(<LoginPage />);
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'admin@admin.com' } });
    const passwordInput = screen.getByLabelText(/senha/i);
    fireEvent.change(passwordInput, { target: { value: 'senha123' } });
    fireEvent.submit(getForm(container));
    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'admin@admin.com',
        password: 'senha123',
      });
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('exibe erro de credenciais inválidas do Supabase', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: {},
      error: { message: 'Invalid login credentials' },
    });
    const { container } = render(<LoginPage />);
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'admin@admin.com' } });
    const passwordInput = screen.getByLabelText(/senha/i);
    fireEvent.change(passwordInput, { target: { value: 'senhaerrada' } });
    fireEvent.submit(getForm(container));
    await waitFor(() => {
      expect(screen.getByText('Email ou senha inválidos')).toBeInTheDocument();
    });
  });

  it('exibe erro genérico do Supabase', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: {},
      error: { message: 'Erro de conexão' },
    });
    const { container } = render(<LoginPage />);
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'admin@admin.com' } });
    const passwordInput = screen.getByLabelText(/senha/i);
    fireEvent.change(passwordInput, { target: { value: 'senha123' } });
    fireEvent.submit(getForm(container));
    await waitFor(() => {
      expect(screen.getByText('Erro de conexão')).toBeInTheDocument();
    });
  });

  it('exibe estado de loading durante login', async () => {
    let resolveSignIn: (value: any) => void;
    mockSignInWithPassword.mockImplementationOnce(() => new Promise((resolve) => { resolveSignIn = resolve; }));
    const { container } = render(<LoginPage />);
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'admin@admin.com' } });
    const passwordInput = screen.getByLabelText(/senha/i);
    fireEvent.change(passwordInput, { target: { value: 'senha123' } });
    fireEvent.submit(getForm(container));
    // Botão mostra spinner + "Entrar"
    const submitBtn = screen.getByRole('button', { name: /entrar/i });
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toContainHTML('Entrar');
    resolveSignIn!({ data: {}, error: null });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('possui checkbox "Lembrar-me"', () => {
    render(<LoginPage />);
    const rememberCheckbox = screen.getByRole('checkbox', { name: /lembrar-me/i });
    expect(rememberCheckbox).toBeInTheDocument();
    expect(rememberCheckbox).not.toBeChecked();
  });

  it('permite marcar "Lembrar-me"', () => {
    render(<LoginPage />);
    const rememberCheckbox = screen.getByRole('checkbox', { name: /lembrar-me/i });
    fireEvent.click(rememberCheckbox);
    expect(rememberCheckbox).toBeChecked();
  });

  it('exibe link para suporte', () => {
    render(<LoginPage />);
    const supportLink = screen.getByRole('link', { name: /fale conosco/i });
    expect(supportLink).toBeInTheDocument();
    expect(supportLink).toHaveAttribute('href', '/suporte');
  });

  it('campos são obrigatórios (required)', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeRequired();
    expect(screen.getByLabelText(/senha/i)).toBeRequired();
  });

  it('exibe versão no rodapé', () => {
    render(<LoginPage />);
    expect(screen.getByText('Cesta Solidária v1.0 - Mazotech Sistemas')).toBeInTheDocument();
  });
});
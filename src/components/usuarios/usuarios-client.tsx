'use client';

import React, { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types/database';

interface UsuariosClientProps {
  usuarios: Profile[];
  currentUserId: string;
}

export default function UsuariosClient({ usuarios, currentUserId }: UsuariosClientProps) {
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nome: '',
    is_admin: false,
  });
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    const supabase = createClient();
    const { data, error: err } = await supabase.rpc('admin_criar_usuario', {
      p_email: formData.email.trim(),
      p_senha: formData.password,
      p_nome: formData.nome.trim(),
      p_is_admin: formData.is_admin,
    });

    if (err) {
      setError(err.message);
      setCreating(false);
      return;
    }

    setCreating(false);
    setShowModal(false);
    setFormData({ email: '', password: '', nome: '', is_admin: false });
    window.location.reload();
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuario? Esta acao nao pode ser desfeita.')) {
      return;
    }

    setDeleting(userId);
    const supabase = createClient();

    const { error: err } = await supabase.rpc('admin_excluir_usuario', {
      p_id: userId,
    });

    if (err) {
      alert('Erro ao excluir: ' + err.message);
      setDeleting(null);
      return;
    }

    setDeleting(null);
    window.location.reload();
  };

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    setToggling(userId);
    const supabase = createClient();

    const { error: err } = await supabase
      .from('profiles')
      .update({ is_admin: !currentIsAdmin })
      .eq('id', userId);

    if (err) {
      alert('Erro ao alterar permissao: ' + err.message);
      setToggling(null);
      return;
    }

    setToggling(null);
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <span className="text-sm text-steel">
            {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} cadastrado{usuarios.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Novo Usuario
        </button>
      </div>

      {error && (
        <div className="badge badge-error w-full justify-center" role="alert">
          {error}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="divide-y divide-[var(--line)]">
          <div className="p-4 bg-ice/50 table-header">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
              <span className="text-sm font-semibold">Nome</span>
              <span className="text-sm font-semibold">Email</span>
              <span className="text-sm font-semibold">Perfil</span>
              <span className="text-sm font-semibold text-right">Acoes</span>
            </div>
          </div>
          {usuarios.map((user) => {
            const isSelf = user.id === currentUserId;

            return (
              <div key={user.id} className="p-4 table-row">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                  <div className="min-w-0">
                    <p className="font-medium text-navy truncate">{user.nome}</p>
                    {isSelf && <span className="text-xs text-royal font-medium">(voce)</span>}
                  </div>
                  <div className="text-sm text-steel truncate">{user.id}</div>
                  <div>
                    <span className={`badge ${user.is_admin ? 'badge-primary' : 'badge-secondary'}`}>
                      {user.is_admin ? 'Administrador' : 'Voluntario'}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    {!isSelf && (
                      <button
                        onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                        disabled={toggling === user.id}
                        className="btn-ghost text-xs"
                      >
                        {user.is_admin ? 'Tornar Voluntario' : 'Tornar Admin'}
                      </button>
                    )}
                    {!isSelf && (
                      <button
                        onClick={() => handleDelete(user.id)}
                        disabled={deleting === user.id}
                        className="btn-ghost text-xs text-red-700 hover:bg-red-50"
                      >
                        {deleting === user.id ? 'Excluindo...' : 'Excluir'}
                      </button>
                    )}
                    {isSelf && (
                      <span className="text-xs text-steel/50">Nao pode alterar a si mesmo</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {usuarios.length === 0 && (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-steel/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="font-semibold text-navy mb-1">Nenhum usuario encontrado</h3>
            <p className="text-steel">Clique em Novo Usuario para criar o primeiro</p>
          </div>
        )}
      </div>

      {/* Modal Criar Usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-extrabold tracking-[-0.02em] text-navy mb-4">Criar Novo Usuario</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label htmlFor="nome" className="label">Nome</label>
                <input
                  id="nome"
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="input"
                  required
                  disabled={creating}
                />
              </div>
              <div>
                <label htmlFor="email" className="label">Email</label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                  required
                  disabled={creating}
                />
              </div>
              <div>
                <label htmlFor="password" className="label">Senha</label>
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input"
                  required
                  minLength={6}
                  disabled={creating}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="is_admin"
                  type="checkbox"
                  checked={formData.is_admin}
                  onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                  className="w-4 h-4 text-royal border-[var(--line)] rounded focus:ring-2 focus:ring-royal/20"
                />
                <label htmlFor="is_admin" className="text-sm text-steel cursor-pointer">
                  Administrador
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                  disabled={creating}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={creating}
                >
                  {creating ? 'Criando...' : 'Criar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
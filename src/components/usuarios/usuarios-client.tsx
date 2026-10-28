'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { Spinner } from '@/components/ui/spinner';
import { PlusIcon } from '@/components/icons';

interface UsuariosClientProps {
  users: Profile[];
  currentUserId: string;
}

export default function UsuariosClient({ users: usersIniciais, currentUserId }: UsuariosClientProps) {
  const [users, setUsers] = useState<Profile[]>(usersIniciais);
  const [newUser, setNewUser] = useState({ email: '', senha: '', nome: '', is_admin: false });
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { push: toast } = useToast();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.senha || !newUser.nome) {
      toast('Preencha todos os campos', 'error');
      return;
    }
    setCreating(true);
    const supabase = createClient();
    const { error } = await supabase.rpc('admin_criar_usuario', {
      p_email: newUser.email,
      p_senha: newUser.senha,
      p_nome: newUser.nome,
      p_is_admin: newUser.is_admin,
    });
    if (error) {
      toast(error.message, 'error');
      setCreating(false);
      return;
    }
    toast('Usuário criado com sucesso', 'success');
    setNewUser({ email: '', senha: '', nome: '', is_admin: false });
    setShowModal(false);
    setCreating(false);
    refreshUsers();
  };

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    setToggling(userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: !currentIsAdmin } : u));
    const supabase = createClient();
    const { error } = await supabase.from('profiles').update({ is_admin: !currentIsAdmin }).eq('id', userId);
    if (error) {
      toast(error.message, 'error');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: currentIsAdmin } : u));
    } else {
      toast(`Usuário agora é ${!currentIsAdmin ? 'Administrador' : 'Voluntário'}`, 'success');
    }
    setToggling(null);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) return;
    setDeleting(userId);
    const supabase = createClient();
    const { error } = await supabase.rpc('admin_excluir_usuario', { p_id: userId });
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Usuário excluído', 'success');
      setUsers(prev => prev.filter(u => u.id !== userId));
    }
    setDeleting(null);
  };

  async function refreshUsers() {
    const supabase = createClient();
    const { data } = await supabase.from('profiles').select('*').order('criado_em', { ascending: false });
    if (data) setUsers(data);
  }

  const admins = users.filter(u => u.is_admin).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-extrabold tracking-[-0.02em] text-navy">Lista de Usuários</h2>
          <p className="text-[13px] text-steel mt-0.5 tabular-nums">
            {users.length} conta{users.length !== 1 ? 's' : ''} · {admins} admin{admins !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <PlusIcon size={15} />
          Novo Usuário
        </Button>
      </div>

      <div className="panel overflow-hidden">
        <div className="hidden sm:flex items-center gap-4 px-4 py-2.5 bg-ice/70 border-b border-[var(--line)]">
          <span className="th flex-1 px-0">Nome</span>
          <span className="th w-[140px] px-0">Perfil</span>
          <span className="th w-[120px] px-0 text-right">Ativo desde</span>
          <span className="th w-[220px] px-0 text-right">Ações</span>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-ice/40 sm:flex-nowrap"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="w-9 h-9 rounded-[11px] bg-navy text-paper flex items-center justify-center text-[12px] font-extrabold flex-shrink-0">
                  {user.nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-navy text-[14px] truncate">{user.nome}</span>
                  {user.id === currentUserId && (
                    <span className="block text-[11.5px] text-steel">você</span>
                  )}
                </span>
              </div>

              <div className="flex-shrink-0 sm:w-[140px]">
                <Badge variant={user.is_admin ? 'primary' : 'secondary'}>
                  {user.is_admin ? 'Administrador' : 'Voluntário'}
                </Badge>
              </div>

              <div className="hidden sm:block sm:w-[120px] text-right text-steel text-[13px] tabular-nums">
                {user.criado_em ? new Date(user.criado_em).toLocaleDateString('pt-BR') : '-'}
              </div>

              <div className="flex w-full items-center justify-end gap-1 sm:w-[220px]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                  disabled={toggling === user.id || user.id === currentUserId}
                >
                  {toggling === user.id ? (
                    <Spinner className="size-4" />
                  ) : (
                    user.is_admin ? 'Para Voluntário' : 'Para Admin'
                  )}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(user.id)}
                  disabled={deleting === user.id || user.id === currentUserId}
                >
                  {deleting === user.id ? <Spinner className="size-4" /> : 'Excluir'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Novo Usuário */}
      <Dialog open={showModal} onClose={() => setShowModal(false)} title="Novo Usuário" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label htmlFor="novo-email">Email</Label>
            <Input
              id="novo-email"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="usuario@exemplo.com"
              required
              disabled={creating}
            />
          </div>
          <div>
            <Label htmlFor="novo-senha">Senha</Label>
            <Input
              id="novo-senha"
              type="password"
              value={newUser.senha}
              onChange={(e) => setNewUser({ ...newUser, senha: e.target.value })}
              placeholder="••••••••"
              required
              disabled={creating}
            />
          </div>
          <div>
            <Label htmlFor="novo-nome">Nome</Label>
            <Input
              id="novo-nome"
              type="text"
              value={newUser.nome}
              onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })}
              placeholder="Nome completo"
              required
              disabled={creating}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="novo-admin"
              checked={newUser.is_admin}
              onChange={(e) => setNewUser({ ...newUser, is_admin: e.target.checked })}
              className="w-4 h-4 rounded border-[var(--line)] text-royal focus:ring-2 focus:ring-royal/20"
              disabled={creating}
            />
            <Label htmlFor="novo-admin" className="mb-0 cursor-pointer">Administrador</Label>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button type="submit" disabled={creating} loading={creating}>
              Criar Usuário
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

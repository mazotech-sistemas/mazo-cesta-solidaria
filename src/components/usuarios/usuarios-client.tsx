'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';

interface UsuariosClientProps {
  users: Profile[];
  currentUserId: string;
}

export default function UsuariosClient({ users, currentUserId }: UsuariosClientProps) {
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
    window.location.reload();
  };

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    setToggling(userId);
    const supabase = createClient();
    const { error } = await supabase.from('profiles').update({ is_admin: !currentIsAdmin }).eq('id', userId);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast(`Usuário agora é ${!currentIsAdmin ? 'Administrador' : 'Voluntário'}`, 'success');
    }
    setToggling(null);
    window.location.reload();
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
    }
    setDeleting(null);
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold tracking-[-0.02em] text-navy">Lista de Usuários</h2>
        <Button onClick={() => setShowModal(true)}>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Usuário
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium text-navy">{user.nome}</TableCell>
                  <TableCell className="text-steel font-mono text-sm">{user.id}</TableCell>
                  <TableCell>
                    <Badge variant={user.is_admin ? 'primary' : 'secondary'}>
                      {user.is_admin ? 'Administrador' : 'Voluntário'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                        disabled={toggling === user.id || user.id === currentUserId}
                      >
                        {toggling === user.id ? (
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          user.is_admin ? 'Para Voluntário' : 'Para Admin'
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(user.id)}
                        disabled={deleting === user.id || user.id === currentUserId}
                      >
                        {deleting === user.id ? (
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : 'Excluir'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
              className="w-4 h-4 text-royal border-[var(--line)] rounded focus:ring-2 focus:ring-royal/20"
              disabled={creating}
            />
            <Label htmlFor="novo-admin" className="mb-0 cursor-pointer">Administrador</Label>
          </div>
          <div className="flex gap-3 pt-2">
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
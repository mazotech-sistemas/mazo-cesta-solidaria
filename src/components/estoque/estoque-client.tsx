'use client';

import React, { useState } from 'react';
import { Produto } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

interface EstoqueClientProps {
  produtos: Produto[];
  isAdmin: boolean;
}

export default function EstoqueClient({ produtos, isAdmin }: EstoqueClientProps) {
  const [search, setSearch] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);

  const filtered = produtos
    .filter((p) => {
      if (search && !p.nome.toLowerCase().includes(search.toLowerCase()) && !(p.marca || '').toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (showLowStock && p.estoque_atual > 2) {
        return false;
      }
      return true;
    });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-64">
          <Input
            type="text"
            placeholder="Buscar por nome ou marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showLowStock}
            onChange={(e) => setShowLowStock(e.target.checked)}
            className="w-4 h-4 text-royal border-[var(--line)] rounded focus:ring-2 focus:ring-royal/20"
          />
          <span className="text-sm text-steel">Só estoque baixo (≤2)</span>
        </label>
        {isAdmin && (
          <Link href="/estoque/novo">
            <Button size="sm">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo Produto
            </Button>
          </Link>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-steel/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="font-semibold text-navy mb-1">Nenhum produto encontrado</h3>
              <p className="text-steel">Tente ajustar os filtros ou {isAdmin ? 'adicionar um novo produto' : 'verificar mais tarde'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead align="right">Estoque</TableHead>
                    <TableHead align="right">Preço Atual</TableHead>
                    <TableHead align="right">Qtd/Cesta</TableHead>
                    <TableHead align="center">Última Atualização</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-navy">{p.nome}</span>
                          {p.estoque_atual <= 2 && (
                            <Badge variant="warning">Baixo</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-steel">{p.marca || '-'}</TableCell>
                      <TableCell align="right" className="font-medium">
                        <span className={p.estoque_atual <= 2 ? 'text-red-700 font-bold' : 'text-navy'}>
                          {p.estoque_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell align="right" className="font-medium text-navy">
                        R$ {p.preco_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell align="right">{p.qtd_por_cesta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell align="center" className="text-steel text-xs">
                        {p.ultima_atualizacao_preco
                          ? new Date(p.ultima_atualizacao_preco).toLocaleDateString('pt-BR')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-steel/60">
        Mostrando {filtered.length} de {produtos.length} produto{produtos.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
# Convite de Usuários sem Conta - Documentação de Implementação

## Sumário das Mudanças

### 1. Novo Model: `PendingInvite`
**Arquivo**: `prisma/schema.prisma`

Adicionado model `PendingInvite` para rastrear convites pendentes para usuários que ainda não criaram conta:

```prisma
model PendingInvite {
  id          String     @id @default(cuid())
  token       String     @unique @default(cuid())
  workspaceId String
  email       String
  role        MemberRole @default(EDITOR)
  invitedBy   String
  expiresAt   DateTime
  createdAt   DateTime   @default(now())

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId, email])
  @@map("pending_invites")
}
```

**Características**:
- Token único e opaco (CUID)
- Expiração de 7 dias
- Relacionamento com Workspace e role do convite
- Índice composto para lookups rápidos

### 2. Ação: `inviteMember` (Atualizada)
**Arquivo**: `src/server/actions/workspaces.ts`

**Novo Comportamento**:
- **Usuário com conta**: Cria `WorkspaceMember` direto (comportamento anterior)
- **Usuário sem conta**: Cria `PendingInvite` com token e retorna o link de convite

**Resposta da ação**:
```typescript
{
  success: true,
  userExists: false,
  inviteLink: "/invite/[token]",
  inviteToken: "[token]"
}
// ou
{
  success: true,
  userExists: true
}
```

### 3. Página de Convite (Atualizada)
**Arquivo**: `src/app/(auth)/invite/[token]/page.tsx`

**Mudanças**:
- Lookup por `PendingInvite.token` em vez de `workspace.id`
- Verifica expiração do convite
- Redireciona usuários não autenticados para `/register?invite=[token]`
- Ao aceitar: cria `WorkspaceMember`, deleta `PendingInvite`
- Mostra mensagem de erro se convite expirou

### 4. Endpoint de Registro (Atualizado)
**Arquivo**: `src/app/api/auth/register/route.ts`

**Novo Fluxo**:
1. Após criar o usuário, busca `PendingInvite` com `email === newUser.email`
2. Se encontra convites:
   - Cria `WorkspaceMember` para cada convite
   - Deleta os `PendingInvite`
   - Retorna o primeiro workspace como padrão
3. Se não encontra:
   - Comportamento anterior (cria workspace padrão)

**Resultado**: Nenhum workspace órfão é criado quando o usuário foi convidado!

### 5. Callback JWT do OAuth (Atualizado)
**Arquivo**: `src/lib/auth/options.ts`

**Mesmo Comportamento que o Register**:
- Verifica `PendingInvite` para novo usuário OAuth
- Se encontra convites, adiciona ao workspace em vez de criar novo
- Se não encontra, cria workspace padrão

### 6. Modal de Convite (Atualizada)
**Arquivo**: `src/components/members/invite-member-modal.tsx`

**Novas Funcionalidades**:
- Mostra feedback diferente para usuários com e sem conta
- Se usuário não tem conta:
  - Exibe o link de convite gerado
  - Botão "Copiar" para copiar o link
  - Mensagem de expiração (7 dias)
- Se usuário tem conta:
  - Comportamento anterior (convite imediato)

## Fluxo Completo

### Cenário 1: Convidar usuário com conta existente
1. Admin clica "Convidar" na página de membros
2. Digite email de usuário com conta
3. Clique em "Convidar"
4. ✅ Usuário é adicionado imediatamente ao workspace
5. ✅ Modal fecha com mensagem de sucesso

### Cenário 2: Convidar usuário sem conta
1. Admin clica "Convidar" na página de membros
2. Digite email de usuário **sem** conta
3. Clique em "Convidar"
4. ✅ Modal mostra link de convite
5. ✅ Admin copia o link
6. Admin envia o link via email para o usuário
7. Usuário clica no link
8. Se não autenticado → redireciona para `/register?invite=[token]`
9. Usuário preenche dados de registro
10. ✅ Ao registrar, **nenhum workspace padrão é criado**
11. ✅ Usuário é adicionado direto ao workspace convidado
12. ✅ Convite pendente é deletado

### Cenário 3: OAuth com convite pendente
1. Link de convite é enviado via email (email: user@example.com)
2. Usuário clica no link → redireciona para `/register?invite=[token]`
3. Usuário clica "Registrar com Google/GitHub"
4. ✅ Após OAuth, não cria workspace padrão
5. ✅ Adiciona usuário ao workspace convidado
6. ✅ Convite pendente é deletado

## Como Testar

### Teste 1: Verificar se workspace padrão é criado na primeira conta
```bash
# 1. Abra http://localhost:3000/register
# 2. Registre uma nova conta com email test@example.com
# 3. Você será redirecionado para o workspace padrão "Meu Workspace"
# ✅ PASS: Workspace foi criado automaticamente
```

### Teste 2: Convidar usuário com conta
```bash
# 1. Abra o workspace como admin
# 2. Vá para "Membros"
# 3. Clique "Convidar"
# 4. Digite email de um usuário com conta
# 5. Clique "Convidar"
# ✅ PASS: Usuário foi adicionado imediatamente
```

### Teste 3: Convidar usuário sem conta e registrar
```bash
# 1. Abra o workspace como admin
# 2. Vá para "Membros"
# 3. Clique "Convidar"
# 4. Digite email: newuser@example.com (sem conta)
# 5. Clique "Convidar"
# ✅ PASS: Modal mostra link de convite
# 6. Copie o link (ex: http://localhost:3000/invite/xyz123)
# 7. Abra o link em navegador anônimo
# ✅ PASS: Redireciona para /register?invite=xyz123
# 8. Preencha dados: name, email (mesmo acima), password
# 9. Clique "Registrar"
# ✅ PASS: Você é adicionado ao workspace original (SEM workspace órfão!)
# 10. Você não vê um "Meu Workspace" próprio
```

### Teste 4: Link expirado
```bash
# Aguarde 7 dias ou edite manualmente o banco para expiresAt no passado
# Abra o link expirado
# ✅ PASS: Mostra mensagem "Convite Expirado"
```

### Teste 5: OAuth com convite pendente
```bash
# 1. Crie um convite para user-oauth@example.com
# 2. Em navegador anônimo, acesse o link de convite
# 3. Clique "Registrar com Google/GitHub"
# 4. Faça login com uma conta Google/GitHub com email user-oauth@example.com
# ✅ PASS: Você é adicionado ao workspace convidado
# ✅ PASS: Nenhum "Meu Workspace" foi criado
```

## Verificação no Banco de Dados

### Ver convites pendentes
```typescript
const pending = await prisma.pendingInvite.findMany();
// Output:
// {
//   id: "xyz",
//   token: "abc123",
//   workspaceId: "ws123",
//   email: "newuser@example.com",
//   role: "EDITOR",
//   expiresAt: "2026-05-01T15:30:00Z",
//   ...
// }
```

### Ver membros adicionados via convite
```typescript
const member = await prisma.workspaceMember.findUnique({
  where: { workspaceId_userId: { workspaceId: "ws123", userId: "user123" } },
});
// Output:
// {
//   id: "mem123",
//   workspaceId: "ws123",
//   userId: "user123",
//   role: "EDITOR",
//   joinedAt: "2026-04-24T15:30:00Z",
//   ...
// }
```

## Próximas Melhorias (Não Implementadas)

1. **Email de Convite**: Enviar email automático com o link
2. **Resend de Convite**: Permitir reenviar um convite pendente
3. **Cancelamento de Convite**: Deletar um convite pendente antes de ser aceito
4. **Múltiplos Convites**: Suportar múltiplos convites para o mesmo email
5. **Convites Por Domínio**: Convidar todos os usuários de um domínio

# Regras de Desenvolvimento e Arquitetura (AI_RULES)

Este documento estabelece as diretrizes técnicas e o uso de bibliotecas para manter a consistência e a qualidade do projeto.

## 1. Tech Stack (Visão Geral)

*   **Framework:** React (com Vite).
*   **Linguagem:** TypeScript.
*   **Estilização:** Tailwind CSS (abordagem mobile-first e responsiva).
*   **Componentes UI:** shadcn/ui (baseado em Radix UI).
*   **Roteamento:** React Router DOM.
*   **Gerenciamento de Estado/Dados:** React Query (@tanstack/react-query) para caching e sincronização de dados.
*   **Backend/Banco de Dados:** Supabase (para DB, Storage e Auth).
*   **Ícones:** Lucide React.
*   **Notificações:** Sonner e o sistema de Toast do shadcn/ui.
*   **Estrutura de Arquivos:** Componentes em `src/components/`, Páginas em `src/pages/`, Lógica de dados em `src/lib/storage.ts`.

## 2. Diretrizes de Uso de Bibliotecas

| Funcionalidade | Biblioteca/Módulo Recomendado | Regras de Uso |
| :--- | :--- | :--- |
| **UI/Estilo** | shadcn/ui, Tailwind CSS | **Obrigatório** usar classes Tailwind para todo o estilo. Utilize os componentes pré-construídos do shadcn/ui. Não crie arquivos CSS customizados. |
| **Roteamento** | `react-router-dom` | Todas as rotas devem ser definidas em `src/App.tsx`. Use `useNavigate` para navegação programática. |
| **Dados/Storage** | `src/lib/storage.ts` (que usa Supabase) | Toda interação com o banco de dados (UBS, Usuários, PDFs) deve ser feita através das funções exportadas de `src/lib/storage.ts`. |
| **Autenticação** | `src/hooks/useAuth.ts` | Use o hook `useAuth` para verificar o estado de autenticação (`isAuthenticated`, `user`) e realizar `login`/`logout`. |
| **Notificações** | `useToast` (do shadcn/ui) e `Sonner` | Use o hook `useToast` (importado de `@/hooks/use-toast`) para feedback ao usuário (sucesso, erro, etc.). |
| **Ícones** | `lucide-react` | Use apenas ícones do pacote `lucide-react`. |
| **QR Code** | `qrcode` | Use o componente `QRCodeComponent` para gerar códigos QR. |

## 3. Estrutura e Convenções

*   **Nomenclatura:** Diretórios em minúsculas (`src/pages`, `src/components`). Nomes de arquivos em PascalCase (ex: `UBSCard.tsx`).
*   **Componentes:** Crie um arquivo separado para cada novo componente. Mantenha os componentes pequenos e focados.
*   **Responsividade:** Todos os designs devem ser responsivos, utilizando as classes de breakpoint do Tailwind CSS (mobile-first).
# Lab Agenda — Back-End

**Sistema de Agendamento e Gerenciamento de Laboratórios Acadêmicos**

API responsável pelo gerenciamento das reservas dos laboratórios de informática da instituição, desenvolvida para organizar a utilização dos espaços acadêmicos, controlar solicitações de agendamento e fornecer informações sobre a utilização dos laboratórios.

O Lab Agenda foi desenvolvido com Node.js, Express e MySQL, seguindo uma estrutura organizada em controllers, repositories, services, routes e middlewares.

---

## Sobre o projeto

O Lab Agenda tem como objetivo facilitar o gerenciamento dos laboratórios acadêmicos, oferecendo um fluxo de reservas organizado entre professores e administradores.

O sistema permite que professores solicitem horários para utilizar os laboratórios, enquanto os administradores são responsáveis por analisar as solicitações, aprovar ou rejeitar reservas e gerenciar os cancelamentos.

Além disso, a aplicação controla conflitos de horários, mantém o histórico das reservas concluídas e disponibiliza dados para relatórios de utilização.

O back-end centraliza as regras de negócio, a comunicação com o banco de dados, a autenticação e a validação das operações realizadas pelo sistema.

## Tecnologias e bibliotecas utilizadas

| Tecnologia / Biblioteca | Finalidade                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| Node.js                 | Ambiente de execução JavaScript no servidor.                                                                |
| Express                 | Framework utilizado para estruturar a API e gerenciar requisições HTTP.                                     |
| MySQL                   | Banco de dados relacional responsável pelo armazenamento das informações.                                   |
| mysql2                  | Biblioteca utilizada para conectar a aplicação ao MySQL e executar consultas SQL com suporte a Promises.    |
| bcrypt                  | Utilizado para gerar e verificar hashes das senhas, evitando o armazenamento de senhas em texto puro.       |
| jsonwebtoken (JWT)      | Responsável pela criação e validação de tokens de autenticação.                                             |
| cors                    | Controla quais origens podem acessar a API, permitindo a comunicação entre o front-end e o back-end.        |
| dotenv                  | Carrega variáveis de ambiente do arquivo `.env`, mantendo configurações e credenciais fora do código-fonte. |
| resend                  | Serviço utilizado para o envio de e-mails, especialmente para ativação de contas de professores.            |
| node:test               | Ferramenta nativa do Node.js utilizada para executar os testes automatizados.                               |

### Comunicação entre front-end e back-end

A API foi configurada para receber requisições do front-end por meio de HTTP.

O Express disponibiliza as funcionalidades do sistema, enquanto o middleware `cors` permite a comunicação entre aplicações executadas em origens diferentes.

Em desenvolvimento, a API permite a origem `http://localhost:3000`. A configuração de produção utiliza a origem definida pela variável `FRONTEND_URL`.

O middleware `express.json()` permite que a API receba e interprete dados enviados no formato JSON.

### Banco de dados

O MySQL é utilizado para armazenar:

- Dados dos professores e administradores.
- Informações de autenticação e ativação das contas.
- Solicitações e reservas dos laboratórios.
- Datas, turnos e horários reservados.
- Situações das reservas e informações de conclusão.

A conexão com o banco é realizada pela biblioteca `mysql2/promise`, utilizando um pool de conexões para executar operações assíncronas.

---

## Como o sistema funciona

O sistema possui dois perfis principais: professor e administrador.

### 1. Gerenciamento de professores

O administrador pode cadastrar professores no sistema, informando nome, e-mail e número de matrícula.

Após o cadastro, o professor recebe um e-mail de ativação enviado pelo Resend.

O processo de ativação utiliza um token aleatório, cujo hash é armazenado no banco de dados. O link possui prazo de validade de 24 horas.

Após acessar o link, o professor pode definir sua senha e ativar a conta.

As senhas são protegidas com bcrypt antes de serem armazenadas.

### 2. Autenticação e autorização

O login verifica as credenciais do usuário utilizando bcrypt.

Após a autenticação, a API gera um token JWT, utilizado para identificar o usuário nas requisições protegidas.

O middleware de autenticação verifica o token recebido no cabeçalho `Authorization`.

O sistema também verifica as permissões de acordo com o perfil do usuário:

- **Professor:** pode solicitar reservas e acompanhar suas próprias reservas.
- **Administrador:** pode gerenciar professores, analisar solicitações, aprovar ou rejeitar reservas, resolver solicitações de cancelamento e administrar os agendamentos.

As operações administrativas são protegidas para impedir que professores executem ações exclusivas do administrador.

### 3. Solicitação de reservas

O professor pode solicitar a utilização de um laboratório informando:

- Disciplina.
- Curso.
- Laboratório.
- Data.
- Turno.
- Horário.

A solicitação é registrada inicialmente com o status `pending`, aguardando análise do administrador.

O administrador também pode criar reservas em nome de professores.

### 4. Aprovação e rejeição

O administrador analisa as solicitações pendentes e pode:

- Aprovar a solicitação, alterando o status para `active`.
- Rejeitar a solicitação, alterando o status para `rejected`.

Somente as reservas aprovadas passam a ocupar efetivamente o horário no laboratório.

As solicitações rejeitadas são removidas automaticamente após 24 horas, por meio de uma rotina executada pelo servidor.

### 5. Controle de conflitos de horários

Um dos principais recursos do back-end é o controle de conflitos.

O sistema impede que dois professores reservem o mesmo laboratório no mesmo dia, turno e horário.

Também impede que um mesmo professor mantenha reservas conflitantes em laboratórios diferentes no mesmo período.

Para isso, o banco de dados utiliza índices únicos e a coluna gerada `blocks_slot`, que determina quais reservas devem bloquear um horário.

Os status que bloqueiam horários são:

- `active`
- `cancellation_requested`
- `completed`

Solicitações pendentes, rejeitadas ou canceladas não bloqueiam horários.

Essa validação também é protegida no banco de dados, evitando que operações simultâneas criem reservas conflitantes.

### 6. Solicitação de cancelamento

O professor não cancela diretamente uma reserva aprovada.

Em vez disso, solicita o cancelamento, alterando o status de `active` para `cancellation_requested`.

O administrador analisa a solicitação e pode:

- Aprovar o cancelamento, alterando o status para `cancelled`.
- Rejeitar o cancelamento, retornando a reserva para `active`.

Enquanto aguarda a decisão, a reserva continua bloqueando o horário.

### 7. Conclusão das reservas

Após a utilização do laboratório, o administrador pode marcar a reserva como concluída.

O status passa a ser `completed`.

As reservas concluídas são mantidas no banco de dados, pois representam o histórico real de utilização dos laboratórios.

Esse histórico é utilizado na geração dos relatórios.

### 8. Relatórios de utilização

O sistema possui uma funcionalidade de relatórios que consolida os dados das reservas concluídas.

Os indicadores incluem:

- Total de reservas concluídas.
- Utilização por laboratório.
- Utilização por turno.
- Utilização por curso.
- Utilização por professor.
- Utilização por horário.
- Utilização por mês.
- Utilização por semestre.
- Mês com maior utilização.
- Horário com maior utilização.

Os relatórios consideram reservas com status `completed`, evitando contabilizar solicitações pendentes, rejeitadas ou canceladas como utilizações efetivas.

---

## Status das reservas

| Status                   | Significado                                           |
| ------------------------ | ----------------------------------------------------- |
| `pending`                | Solicitação aguardando aprovação do administrador.    |
| `active`                 | Reserva aprovada e confirmada.                        |
| `cancellation_requested` | Professor solicitou o cancelamento e aguarda análise. |
| `completed`              | Reserva concluída e registrada no histórico.          |
| `cancelled`              | Cancelamento aprovado pelo administrador.             |
| `rejected`               | Solicitação de reserva rejeitada pelo administrador.  |

---

## Estrutura do projeto

```text
Back-End-Lab-Uninassau/
│
├── src/
│   ├── controller/
│   │   ├── ControllerReport.js
│   │   ├── ControllerReservation.js
│   │   └── ControllerUser.js
│   │
│   ├── database/
│   │   └── Database.js
│   │
│   ├── middleware/
│   │   ├── AuthMiddleware.js
│   │   └── CatchErrors.js
│   │
│   ├── repository/
│   │   └── ReportRepository.js
│   │
│   ├── routes/
│   │   ├── ReportRoutes.js
│   │   ├── ReservationRoutes.js
│   │   └── UserRoutes.js
│   │
│   ├── services/
│   │   ├── ActivationEmailService.js
│   │   ├── EmailService.js
│   │   └── ReportService.js
│   │
│   └── verification/
│       ├── VerificationReport.js
│       ├── verificationLaboratory.js
│       └── verificationTeacher.js
│
├── test/
│   └── backend.test.js
│
├── .env.example
├── .gitignore
├── main.js
├── package.json
├── package-lock.json
├── README.md
└── schema.sql
```

### Responsabilidade das principais camadas

- **Controllers:** recebem as requisições e coordenam a execução das operações.
- **Routes:** definem os caminhos de acesso às funcionalidades e os middlewares utilizados.
- **Repositories:** concentram operações de acesso e consulta ao banco de dados.
- **Services:** implementam serviços e regras auxiliares, como geração de relatórios e envio de e-mails.
- **Middlewares:** realizam autenticação, controle de acesso e tratamento de erros.
- **Database:** configura o pool de conexões com o MySQL.
- **Verification:** contém rotinas de validação utilizadas pelo sistema.

---

## Configuração do ambiente

### Requisitos

- Node.js.
- npm.
- MySQL.
- Conta e chave de API do Resend para envio de e-mails.

### 1. Clonar o repositório

```bash
git clone https://github.com/lucaspy2215/Back-End-Lab-Uninassau.git

cd Back-End-Lab-Uninassau
```

### 2. Instalar as dependências

```bash
npm install
```

### 3. Configurar as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto, utilizando o `.env.example` como referência.

Variáveis utilizadas:

```env
PORT=3001
NODE_ENV=development

FRONTEND_URL=http://localhost:3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=lab_agenda

JWT_SECRET=replace_with_a_secure_random_secret
JWT_EXPIRES_IN=1d

RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=Lab Agenda <onboarding@resend.dev>
```

**Importante:** substitua os valores de exemplo pelas configurações do seu ambiente. Nunca publique o arquivo `.env`, senhas, tokens ou chaves de API no GitHub.

### 4. Configurar o banco de dados

O arquivo `schema.sql` contém a estrutura inicial do banco de dados, incluindo as tabelas, relacionamentos, índices e regras de bloqueio de horários.

Para uma instalação nova:

```bash
mysql -u root -p < schema.sql
```

**Atenção:** esse comando é destinado à criação de uma instalação nova. Não o utilize como mecanismo de atualização de um banco existente com dados, pois não realiza migrações de estrutura.

### 5. Iniciar o servidor

Modo de desenvolvimento:

```bash
npm run dev
```

Modo normal:

```bash
npm start
```

Por padrão, a API estará disponível em:

```text
http://localhost:3001
```

---

## Testes automatizados

O projeto utiliza o módulo nativo `node:test` do Node.js para executar testes automatizados.

Os testes contemplam:

- Validação de datas de reservas.
- Identificação de datas inválidas.
- Validação de filtros de relatórios.
- Rejeição de filtros inválidos.
- Proteção contra HTML não confiável em e-mails de ativação.
- Cálculo de indicadores dos relatórios.

Para executar:

```bash
npm test
```

---

## Segurança e boas práticas

O back-end implementa mecanismos para proteger as operações e os dados do sistema:

- Senhas protegidas com bcrypt.
- Autenticação baseada em JWT.
- Verificação de permissões por perfil.
- Tokens de ativação armazenados em formato hash.
- Validação das operações realizadas pelos usuários.
- Controle de acesso às funcionalidades administrativas.
- Configuração de CORS para restringir as origens autorizadas.
- Variáveis sensíveis armazenadas em arquivo de ambiente.
- Tratamento centralizado de erros.
- Restrições no banco de dados para prevenir conflitos de reservas.
- Desativação de usuários sem apagar seu histórico de reservas.

O arquivo `.gitignore` impede que arquivos como `.env`, `node_modules`, logs e arquivos locais sejam incluídos no controle de versão.

---

## Integração com o Front-End

O back-end fornece as funcionalidades utilizadas pelo front-end do Lab Agenda para autenticação, cadastro, agendamento, gerenciamento de reservas e visualização de relatórios.

O front-end consome a API por meio de requisições HTTP e utiliza o token JWT nas operações que exigem autenticação.

Em ambiente de desenvolvimento, o front-end pode ser executado em `http://localhost:3000` e a API em `http://localhost:3001`.

---

## Considerações finais

O Lab Agenda foi desenvolvido com o propósito de tornar o gerenciamento dos laboratórios acadêmicos mais eficiente, seguro e organizado.

A aplicação reúne autenticação, controle de permissões, gerenciamento de reservas, prevenção de conflitos, análise de cancelamentos e geração de relatórios em uma API centralizada.

O projeto foi desenvolvido para fins acadêmicos, com foco na aplicação prática de conceitos de desenvolvimento back-end, banco de dados relacionais, APIs REST, segurança e organização de software.

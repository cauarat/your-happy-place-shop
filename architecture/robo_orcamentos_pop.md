# POP 01: Robô de Orçamentos (Camada 1)

## Objetivo
Automatizar o envio de e-mails de orçamentos para clientes usando o Gmail, com base em dados de uma planilha do Google Sheets, garantindo que clientes não recebam e-mails duplicados.

## Regras de Negócio (Lógica de Decisão)

1. **Gatilho (Trigger):** Execução manual (Fase de Teste) ou Cronjob (Fase de Deploy).
2. **Leitura da Fonte da Verdade:**
   - O robô lê todas as linhas da aba principal (Sheet1).
   - Ignora a linha de cabeçalho (Linha 1).
3. **Filtro de Ação (A Regra de Ouro):**
   - Para cada cliente (linha), verificar duas condições obrigatórias e SIMULTÂNEAS:
     - Condição A: A coluna **"Valor"** (índice 6) deve conter algum texto (não pode estar vazia).
     - Condição B: A coluna **"Status de envio"** (índice 7) deve estar VAZIA (ou seja, orçamento nunca foi enviado).
   - Se as duas condições forem verdadeiras -> Prosseguir para envio.
4. **Composição do E-mail (Fase Estilo):**
   - Assunto: `Orçamento Villa Oro: [Produto do Cliente]`
   - Corpo: Template HTML básico, injetando as variáveis: Nome, Produto, Valor, Link do Produto.
5. **Envio (Ação Atômica):**
   - Conectar ao Gmail via SMTP seguro.
   - Enviar o e-mail composto.
6. **Escrita (Ação Autorregenerativa):**
   - Imediatamente após o envio bem-sucedido via SMTP, a coluna "Status de envio" da planilha DEVE ser atualizada para `Enviado`.
   - Se a atualização na planilha falhar, disparar um erro crítico (para evitar loop de reenvio no futuro).

## Tratamento de Falhas
- E-mail vazio ou inválido: Pular cliente e não travar o loop.
- Erro de Autenticação (Gmail): Parar a execução.
- Erro de Autenticação (Sheets): Parar a execução.

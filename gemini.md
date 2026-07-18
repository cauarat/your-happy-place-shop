# 📜 gemini.md — A Constituição do Projeto (Villa Oro)

> **Este arquivo é a Lei.** Apenas atualize `gemini.md` quando: Um esquema mudar, uma regra for adicionada ou a arquitetura for modificada.

---

## 🏗️ Invariantes Arquiteturais

1. **Arquitetura em 3 Camadas (A.N.T):**
   - **Camada 1 (Arquitetura):** POPs em `architecture/`. A lógica dita o código, nunca o contrário.
   - **Camada 2 (Navegação):** Raciocínio (LLM) que roteia dados entre POPs e Ferramentas.
   - **Camada 3 (Ferramentas):** Scripts/Código em `tools/` ou `src/` que executam a ação de forma atômica e determinística.
2. **Ambiente Temporário:** Use `.tmp/` para processamento intermediário (quando aplicável).
3. **Estado Global:** O estado principal da loja vive atualmente no LocalStorage (sem BD em nuvem). Versões são controladas por `CATALOG_VERSION` em `store.ts`.
4. **Dev Server:** O Vite roda localmente na porta 8081.

---

## 🧠 Regras Comportamentais

1. **A Regra do "Dados Primeiro":** A codificação SÓ começa após a confirmação do formato do "Payload" (Esquema de Dados de Entrada/Saída). Sem adivinhações.
2. **Prioridade Absoluta:** Confiabilidade > Velocidade.
3. **Autocorreção (Loop de Reparo):** Se falhar -> Analisar -> Corrigir -> Testar -> Atualizar POPs em `architecture/`.
4. **Sem scripts prematuros:** Nada em `tools/` (ou scripts Python de automação) até que a Visão, o Schema e o Link estejam concluídos.

---

## 💾 Esquemas de Dados (Schemas Principais)

*(A ser preenchido durante a Fase V)*

### 1. Payload de Entrada (Input)
```json
{
  "spreadsheet_id": "1JYfKUXi7wHA1srLDAnHrRExnCDMx4ODFJJ38NdOpN6k",
  "row_data": {
    "Data": "string",
    "Produto": "string",
    "CEP": "string",
    "Email": "string",
    "Telefone/whatsapp": "string",
    "links dos produtos": "string (URL da imagem)",
    "Valor": "string",
    "Status de envio": "string (ex: 'Pendente')",
    "Primeiro nome do cliente": "string"
  }
}
```

### 2. Payload de Saída (Output)
```json
{
  "email_enviado": {
    "to": "string (Email do cliente)",
    "subject": "Orçamento Villa Oro: [Produto]",
    "body_html": "string",
    "timestamp_envio": "ISO-8601 string"
  },
  "planilha_atualizada": {
    "linha": "integer",
    "novo_status": "Enviado"
  }
}
```

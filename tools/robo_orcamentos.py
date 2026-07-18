"""
Robô de Orçamentos — Villa Oro
================================
Camada 3 (Ferramenta): Script determinístico e atômico.
Lógica definida em: architecture/robo_orcamentos_pop.md

Fluxo:
  1. Lê a planilha inteira.
  2. Filtra: Valor preenchido + Status de envio vazio.
  3. Envia e-mail com orçamento.
  4. Atualiza status para "Enviado" na planilha.
"""

import os
import sys
import smtplib
import re
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

# ─── Configuração ────────────────────────────────────────────────────────────

SPREADSHEET_ID = "1JYfKUXi7wHA1srLDAnHrRExnCDMx4ODFJJ38NdOpN6k"
SHEET_NAME = "Sheet1"
PROJECT_ROOT = os.path.dirname(os.path.dirname(__file__))
CREDS_PATH = os.path.join(PROJECT_ROOT, "credentials.json")
ENV_PATH = os.path.join(PROJECT_ROOT, ".env")

# Índices das colunas (0-indexed)
COL_DATA = 0
COL_PRODUTO = 1
COL_CEP = 2
COL_EMAIL = 3
COL_TELEFONE = 4
COL_LINK = 5
COL_VALOR = 6
COL_STATUS = 7
COL_NOME = 8

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets"  # Leitura E escrita
]


# ─── Utilitários ─────────────────────────────────────────────────────────────

def load_env():
    """Carrega variáveis do .env sem dependências externas."""
    env_vars = {}
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    env_vars[key.strip()] = val.strip().strip('"').strip("'")
    return env_vars


def get_safe_cell(row, index):
    """Retorna o valor de uma célula de forma segura (evita IndexError)."""
    if index < len(row):
        return str(row[index]).strip()
    return ""


def is_valid_email(email):
    """Validação básica de formato de e-mail."""
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email))


# ─── Conexão Google Sheets ───────────────────────────────────────────────────

def connect_sheets():
    """Autentica e retorna o serviço da API do Google Sheets."""
    if not os.path.exists(CREDS_PATH):
        print(f"❌ ERRO CRÍTICO: credentials.json não encontrado em {CREDS_PATH}")
        sys.exit(1)

    creds = Credentials.from_service_account_file(CREDS_PATH, scopes=SCOPES)
    service = build("sheets", "v4", credentials=creds)
    return service.spreadsheets()


def read_all_rows(sheet):
    """Lê todas as linhas da planilha (incluindo o cabeçalho)."""
    result = sheet.values().get(
        spreadsheetId=SPREADSHEET_ID,
        range=f"{SHEET_NAME}!A:H"
    ).execute()
    return result.get("values", [])


def update_status(sheet, row_number, status_text):
    """Atualiza a coluna 'Status de envio' (H) de uma linha específica."""
    cell_range = f"{SHEET_NAME}!H{row_number}"
    sheet.values().update(
        spreadsheetId=SPREADSHEET_ID,
        range=cell_range,
        valueInputOption="RAW",
        body={"values": [[status_text]]}
    ).execute()


# ─── Composição do E-mail ────────────────────────────────────────────────────

def build_email_html(nome, produto, valor, image_url, data):
    """Gera o HTML do e-mail de orçamento (Design Clean/Shopify)."""

    whatsapp_number = "5562983380308"
    nome_texto = nome if nome else "Cliente"
    whatsapp_msg = f"Olá! Gostaria de falar sobre o orçamento do produto: {produto}"
    whatsapp_url = f"https://wa.me/{whatsapp_number}?text={whatsapp_msg.replace(' ', '%20')}"

    # Imagem fallback caso o link não seja válido
    img_tag = ""
    if image_url:
        img_tag = f'<img src="{image_url}" alt="{produto}" style="width:100%; max-width:64px; height:auto; border-radius:8px; object-fit:cover; display:block;" onerror="this.style.display=\\\'none\\\'">'
    else:
        img_tag = f'<div style="width:64px; height:64px; background-color:#eaeaea; border-radius:8px; display:inline-block;"></div>'

    return f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

    <!-- Header -->
    <tr><td style="padding-bottom:24px;border-bottom:1px solid #e5e5e5;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="left">
                    <h1 style="margin:0;font-size:24px;font-weight:400;color:#c9a96e;letter-spacing:2px;text-transform:uppercase;">Villa Oro</h1>
                </td>
                <td align="right">
                    <span style="font-size:13px;color:#888888;text-transform:uppercase;letter-spacing:1px;">Orçamento</span>
                </td>
            </tr>
        </table>
    </td></tr>

    <!-- Greeting & Message -->
    <tr><td style="padding:40px 0;">
        <h2 style="margin:0 0 16px;font-size:24px;font-weight:400;color:#1a1a1a;">Olá, {nome_texto}!</h2>
        <p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:#555555;">
            Aqui está o orçamento que você solicitou. Estamos à disposição para finalizar sua compra ou tirar qualquer dúvida.
        </p>

        <!-- CTA WhatsApp (Shopify Black Button Style) -->
        <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center" bgcolor="#000000" style="border-radius:4px;">
                    <a href="{whatsapp_url}" target="_blank" style="display:inline-block;padding:16px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Ver seu pedido</a>
                </td>
                <td style="padding-left:16px;">
                    <span style="font-size:14px;color:#555555;">ou chame no<br><strong>+55 (62) 98338-0308</strong></span>
                </td>
            </tr>
        </table>
    </td></tr>

    <!-- Order Summary Title -->
    <tr><td style="padding-top:20px;">
        <h3 style="margin:0 0 16px;font-size:18px;font-weight:400;color:#1a1a1a;">Resumo do Orçamento</h3>
    </td></tr>

    <!-- Product Row -->
    <tr><td style="padding:20px 0;border-top:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td width="80" valign="middle" style="padding-right:16px;">
                    <div style="width:64px;height:64px;border:1px solid #e5e5e5;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#f9f9f9;">
                        {img_tag}
                    </div>
                </td>
                <td valign="middle">
                    <p style="margin:0;font-size:15px;font-weight:600;color:#1a1a1a;">{produto}</p>
                </td>
                <td align="right" valign="middle">
                    <p style="margin:0;font-size:15px;font-weight:600;color:#1a1a1a;">{valor}</p>
                </td>
            </tr>
        </table>
    </td></tr>

    <!-- Totals -->
    <tr><td style="padding-top:24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="right" style="padding-bottom:12px;font-size:14px;color:#777777;">Data</td>
                <td align="right" width="120" style="padding-bottom:12px;font-size:14px;color:#1a1a1a;">{data}</td>
            </tr>
            <tr>
                <td align="right" style="padding-top:16px;font-size:16px;color:#555555;">Total</td>
                <td align="right" width="120" style="padding-top:16px;font-size:24px;font-weight:700;color:#1a1a1a;">{valor}</td>
            </tr>
        </table>
    </td></tr>

    <!-- Footer -->
    <tr><td style="padding-top:60px;">
        <div style="border-top:1px solid #e5e5e5;padding-top:24px;">
            <h4 style="margin:0 0 8px;font-size:16px;font-weight:400;color:#1a1a1a;">Informações do Cliente</h4>
            <p style="margin:0 0 24px;font-size:14px;color:#777777;line-height:1.5;">
                {nome_texto}<br>
                {data}
            </p>
            <p style="margin:0;font-size:12px;color:#999999;">
                Villa Oro - Curadoria de Luxo<br>
                Se você não solicitou este orçamento, por favor ignore este e-mail.
            </p>
        </div>
    </td></tr>

</table>
</td></tr>
</table>
</body>
</html>
    """


# ─── Envio de E-mail ─────────────────────────────────────────────────────────

def send_email(sender, password, to_email, subject, html_body):
    """Envia um e-mail via SMTP do Gmail."""
    msg = MIMEMultipart("alternative")
    msg["From"] = sender
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))

    server = smtplib.SMTP("smtp.gmail.com", 587)
    server.starttls()
    server.login(sender, password)
    server.sendmail(sender, to_email, msg.as_string())
    server.quit()


# ─── Loop Principal ──────────────────────────────────────────────────────────

def main():
    print("=" * 50)
    print("🤖 Robô de Orçamentos — Villa Oro")
    print("=" * 50)

    # 1. Carregar credenciais do .env
    env = load_env()
    gmail_user = env.get("GMAIL_USER")
    gmail_pass = env.get("GMAIL_APP_PASSWORD", "").replace(" ", "")

    if not gmail_user or not gmail_pass:
        print("❌ ERRO CRÍTICO: GMAIL_USER ou GMAIL_APP_PASSWORD não configurados no .env")
        sys.exit(1)

    # 2. Conectar na planilha
    print("📊 Conectando ao Google Sheets...")
    sheet = connect_sheets()

    # 3. Ler todas as linhas
    rows = read_all_rows(sheet)
    if len(rows) <= 1:
        print("⚠️ Planilha vazia ou sem dados (apenas cabeçalho encontrado).")
        return

    header = rows[0]
    data_rows = rows[1:]
    print(f"   Encontradas {len(data_rows)} linhas de dados (excluindo cabeçalho).")

    # 4. Filtrar e processar
    enviados = 0
    pulados = 0
    erros = 0

    for i, row in enumerate(data_rows):
        row_number = i + 2  # Linha real na planilha (1-indexed + cabeçalho)

        valor = get_safe_cell(row, COL_VALOR)
        status = get_safe_cell(row, COL_STATUS)
        email_cliente = get_safe_cell(row, COL_EMAIL)
        produto = get_safe_cell(row, COL_PRODUTO)
        nome = get_safe_cell(row, COL_NOME)

        # Regra de Ouro: Valor preenchido E Status vazio
        if not valor or status:
            pulados += 1
            continue

        # Validar e-mail
        if not email_cliente or not is_valid_email(email_cliente):
            print(f"   ⚠️ Linha {row_number}: E-mail inválido ou vazio ('{email_cliente}'). Pulando.")
            pulados += 1
            continue

        # Extrair dados da linha
        data = get_safe_cell(row, COL_DATA)
        link = get_safe_cell(row, COL_LINK)

        # Compor e enviar
        subject = f"Orçamento Villa Oro: {produto}" if produto else "Orçamento Villa Oro"
        html_body = build_email_html(nome, produto, valor, link, data)

        try:
            print(f"   📧 Linha {row_number}: Enviando para {email_cliente}...", end=" ")
            send_email(gmail_user, gmail_pass, email_cliente, subject, html_body)
            print("✅")

            # Atualizar status na planilha IMEDIATAMENTE
            timestamp = datetime.now().strftime("Enviado %d/%m/%Y %H:%M")
            update_status(sheet, row_number, timestamp)
            enviados += 1

        except Exception as e:
            print(f"❌ ERRO")
            print(f"      Detalhe: {e}")
            erros += 1

    # 5. Relatório final
    print("\n" + "=" * 50)
    print("📋 Relatório Final")
    print(f"   ✅ Enviados com sucesso: {enviados}")
    print(f"   ⏭️  Pulados (já enviados ou sem valor): {pulados}")
    print(f"   ❌ Erros: {erros}")
    print("=" * 50)


if __name__ == "__main__":
    main()

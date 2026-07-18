"""Limpa a coluna 'Status de envio' para permitir reenvio (uso único para teste)."""
import os, sys
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

SPREADSHEET_ID = "1JYfKUXi7wHA1srLDAnHrRExnCDMx4ODFJJ38NdOpN6k"
CREDS_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "credentials.json")
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

creds = Credentials.from_service_account_file(CREDS_PATH, scopes=SCOPES)
service = build("sheets", "v4", credentials=creds)
sheet = service.spreadsheets()

# Ler quantas linhas existem
rows = sheet.values().get(spreadsheetId=SPREADSHEET_ID, range="Sheet1!A:H").execute().get("values", [])
total = len(rows) - 1  # exclui cabeçalho

if total > 0:
    # Limpar coluna H (Status) das linhas 2 até N
    empty_values = [[""] for _ in range(total)]
    sheet.values().update(
        spreadsheetId=SPREADSHEET_ID,
        range=f"Sheet1!H2:H{total + 1}",
        valueInputOption="RAW",
        body={"values": empty_values}
    ).execute()
    print(f"✅ Status de envio limpo para {total} linhas.")
else:
    print("⚠️ Nenhuma linha de dados encontrada.")

import os
import sys
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

def test_connection(spreadsheet_id):
    # Definir escopos para ler planilhas
    SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']
    
    # Caminho do arquivo de credenciais
    creds_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'credentials.json')
    
    if not os.path.exists(creds_path):
        print(f"❌ Erro: Arquivo de credenciais não encontrado em: {creds_path}")
        sys.exit(1)

    try:
        # Carregar credenciais
        creds = Credentials.from_service_account_file(creds_path, scopes=SCOPES)
        service = build('sheets', 'v4', credentials=creds)
        
        # Chamar a API para pegar propriedades da planilha
        sheet = service.spreadsheets()
        
        # Pega a primeira aba da planilha
        sheet_metadata = sheet.get(spreadsheetId=spreadsheet_id).execute()
        first_sheet_name = sheet_metadata.get('sheets', [])[0].get('properties', {}).get('title', 'Página1')
        
        # Ler a primeira linha (A1:Z1)
        result = sheet.values().get(spreadsheetId=spreadsheet_id, range=f'{first_sheet_name}!A1:Z1').execute()
        values = result.get('values', [])
        
        if not values:
            print("⚠️ A planilha está vazia (Nenhum dado encontrado na linha 1).")
        else:
            print(f"✅ Conexão bem sucedida!")
            print(f"📊 Nome da Aba: {first_sheet_name}")
            print(f"👀 Colunas encontradas na linha 1:")
            for i, col in enumerate(values[0]):
                print(f"   - Coluna {chr(65+i)}: {col}")
                
    except Exception as e:
        print(f"❌ Erro de conexão com o Google Sheets:\n{e}")
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Uso: python test_sheets.py <SPREADSHEET_ID>")
        sys.exit(1)
        
    test_connection(sys.argv[1])

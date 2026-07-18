import os
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

SPREADSHEET_ID = "1JYfKUXi7wHA1srLDAnHrRExnCDMx4ODFJJ38NdOpN6k"
CREDS_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "credentials.json")
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

creds = Credentials.from_service_account_file(CREDS_PATH, scopes=SCOPES)
service = build("sheets", "v4", credentials=creds)
sheet = service.spreadsheets()

rows = sheet.values().get(spreadsheetId=SPREADSHEET_ID, range="Sheet1!A:I").execute().get("values", [])
for i, row in enumerate(rows):
    print(f"Row {i+1}: {row}")
